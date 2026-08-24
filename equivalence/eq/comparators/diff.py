"""Tolerance-aware deep diff between two normalized home states.

The frozen schema (docs/schema/home-project.schema.json v1) stores lengths in
centimeters rounded to 3 decimals and angles in degrees. Adapters may disagree
in the last float digits, so comparisons use tolerances:

- positional / length values: 0.01 cm
- angle values (any ``*Deg`` field plus yaw/pitch/fov): 0.05 deg
- ``arcExtent`` stays radians: 0.001 rad (same angular slack)
- colors: exact integer match

Every failure carries the dotted ``path``, ``expected``, ``actual``, the
numeric ``delta`` when applicable and the ``objectId`` of the enclosing
collection item, so reports can pinpoint the offending object directly.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

POS_TOLERANCE = 0.01
ANGLE_TOLERANCE = 0.05
RADIAN_TOLERANCE = 0.001

# Slack so exactly-at-tolerance deltas pass despite binary float noise
# (e.g. 100.02 - 100.01 == 0.010000000000005116).
_EPS = 1e-9

ANGLE_FIELDS = frozenset(
    {
        "angleDeg",
        "pitchDeg",
        "rollDeg",
        "modelRotationDeg",
        "yaw",
        "pitch",
        "fov",
        "yawDeg",
        "fovDeg",
    }
)
RADIAN_FIELDS = frozenset({"arcExtent"})
COLOR_FIELDS = frozenset({"color", "leftSideColor", "rightSideColor", "floorColor"})


def tolerance_for(field: str) -> float | None:
    """Numeric tolerance for a leaf field name; ``None`` means exact."""
    if field in COLOR_FIELDS:
        return None
    if field in RADIAN_FIELDS:
        return RADIAN_TOLERANCE
    if field in ANGLE_FIELDS:
        return ANGLE_TOLERANCE
    return POS_TOLERANCE


@dataclass(frozen=True)
class Failure:
    """One concrete difference between two documents."""

    path: str
    kind: str  # mismatch | missing | extra | count | type
    expected: Any = None
    actual: Any = None
    delta: float | None = None
    objectId: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"kind": self.kind, "path": self.path}
        if self.expected is not None or self.actual is not None:
            out["expected"] = self.expected
            out["actual"] = self.actual
        if self.delta is not None:
            out["delta"] = self.delta
        if self.objectId is not None:
            out["objectId"] = self.objectId
        return out


def _leaf(path: str) -> str:
    return path.rsplit(".", 1)[-1].split("[", 1)[0]


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def deep_diff(
    expected: Any,
    actual: Any,
    *,
    path: str = "",
    objectId: str | None = None,
) -> list[Failure]:
    """Recursively diff two JSON-like documents.

    Numbers are compared with the tolerance of their leaf field name; colors
    must match exactly; everything else compares by equality. Lists are paired
    by index (a length difference additionally yields a ``count`` failure).
    """
    failures: list[Failure] = []
    _diff(expected, actual, path, objectId, failures)
    return failures


def _diff(
    expected: Any,
    actual: Any,
    path: str,
    objectId: str | None,
    out: list[Failure],
) -> None:
    if isinstance(expected, Mapping) and isinstance(actual, Mapping):
        for key, value in expected.items():
            child = f"{path}.{key}" if path else str(key)
            if key not in actual:
                out.append(Failure(child, "missing", expected=value))
            else:
                _diff(value, actual[key], child, objectId, out)
        for key, value in actual.items():
            if key not in expected:
                child = f"{path}.{key}" if path else str(key)
                out.append(Failure(child, "extra", actual=value))
        return

    if isinstance(expected, Sequence) and not isinstance(expected, (str, bytes)) and isinstance(
        actual, Sequence
    ) and not isinstance(actual, (str, bytes)):
        if len(expected) != len(actual):
            out.append(
                Failure(
                    path or "$",
                    "count",
                    expected=len(expected),
                    actual=len(actual),
                    objectId=objectId,
                )
            )
        for index, (item_e, item_a) in enumerate(zip(expected, actual)):
            _diff(item_e, item_a, f"{path}[{index}]" if path else f"[{index}]", objectId, out)
        return

    if isinstance(expected, bool) or isinstance(actual, bool):
        if type(expected) is not type(actual) or expected != actual:
            out.append(
                Failure(path or "$", "type", expected=expected, actual=actual,
                        objectId=objectId)
            )
        return

    if _is_number(expected) and _is_number(actual):
        tolerance = tolerance_for(_leaf(path))
        if tolerance is None:  # colors: exact
            if expected != actual:
                out.append(
                    Failure(path or "$", "mismatch", expected=expected,
                            actual=actual, objectId=objectId)
                )
            return
        delta = abs(float(expected) - float(actual))
        if delta > tolerance + _EPS:
            out.append(
                Failure(
                    path or "$",
                    "mismatch",
                    expected=expected,
                    actual=actual,
                    delta=round(delta, 6),
                    objectId=objectId,
                )
            )
        return

    if type(expected) is not type(actual):
        if expected != actual:
            out.append(
                Failure(
                    path or "$",
                    "type",
                    expected=expected,
                    actual=actual,
                    objectId=objectId,
                )
            )
        return

    if expected != actual:
        out.append(
            Failure(
                path or "$",
                "mismatch",
                expected=expected,
                actual=actual,
                objectId=objectId,
            )
        )


def _item_id(item: Any) -> str | None:
    if isinstance(item, Mapping) and isinstance(item.get("id"), str):
        return item["id"]
    return None


def compare_states(
    expected_state: Mapping[str, Any],
    actual_state: Mapping[str, Any],
    id_map: Any = None,
) -> list[Failure]:
    """Diff two full NormalizedHomeState documents.

    ``id_map`` (see :mod:`eq.comparators.match`) aligns object identities that
    differ between adapters: the actual state is rewritten into the expected
    state's id space before diffing, so ``id``, ``levelRef`` and ``selection``
    fields compare meaningfully instead of failing on cosmetic id differences.
    Collection items are tagged with their (expected-space) id in every failure.
    """
    expected = dict(expected_state)
    actual = dict(actual_state)
    if id_map is not None:
        actual = id_map.rewrite_actual(actual)

    failures: list[Failure] = []
    for key, value in expected.items():
        child = key
        if key not in actual:
            failures.append(Failure(child, "missing", expected=value))
            continue
        if key in ("walls", "rooms", "furniture", "dimensionLines", "labels"):
            _diff_collections(value, actual[key], child, failures)
        else:
            _diff(value, actual[key], child, None, failures)
    for key, value in actual.items():
        if key not in expected:
            failures.append(Failure(key, "extra", actual=value))
    return failures


def _diff_collections(
    expected_items: Sequence[Any],
    actual_items: Sequence[Any],
    path: str,
    out: list[Failure],
) -> None:
    if len(expected_items) != len(actual_items):
        out.append(
            Failure(path, "count", expected=len(expected_items), actual=len(actual_items))
        )
    for index, (item_e, item_a) in enumerate(zip(expected_items, actual_items)):
        _diff(
            item_e,
            item_a,
            f"{path}[{index}]",
            _item_id(item_e),
            out,
        )
