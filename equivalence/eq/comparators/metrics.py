"""Geometry metrics for quick triage of equivalence failures.

Where the deep diff pinpoints individual fields, metrics summarize whole
collections (total wall length, floor area, perimeter) so reports can say
"rooms differ by 1234 cm²" at a glance.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

from eq.comparators.diff import Failure

# Aggregates accumulate small per-object deltas; give them slightly more
# slack than the 0.01 cm field tolerance.
METRIC_TOLERANCE = 0.05


def wall_length(wall: Mapping[str, Any]) -> float:
    return math.hypot(
        float(wall["xEnd"]) - float(wall["xStart"]),
        float(wall["yEnd"]) - float(wall["yStart"]),
    )


def room_points(room: Mapping[str, Any]) -> list[tuple[float, float]]:
    points = room.get("points", [])
    return [
        (float(p["x"]), float(p["y"])) if isinstance(p, Mapping) else (float(p[0]), float(p[1]))
        for p in points
    ]


def polygon_area(points: Sequence[tuple[float, float]]) -> float:
    """Shoelace area; returns 0 for degenerate (<3 points) polygons."""
    if len(points) < 3:
        return 0.0
    total = 0.0
    for (x0, y0), (x1, y1) in zip(points, (*points[1:], points[0])):
        total += x0 * y1 - x1 * y0
    return abs(total) / 2.0


def polygon_perimeter(points: Sequence[tuple[float, float]]) -> float:
    if len(points) < 2:
        return 0.0
    total = 0.0
    for (x0, y0), (x1, y1) in zip(points, (*points[1:], points[0])):
        total += math.hypot(x1 - x0, y1 - y0)
    return total


def geometry_summary(state: Mapping[str, Any]) -> dict[str, dict[str, float]]:
    walls = state.get("walls", [])
    rooms = state.get("rooms", [])
    areas = [polygon_area(room_points(r)) for r in rooms]
    perimeters = [polygon_perimeter(room_points(r)) for r in rooms]
    return {
        "walls": {
            "count": float(len(walls)),
            "totalLength": round(sum(wall_length(w) for w in walls), 3),
        },
        "rooms": {
            "count": float(len(rooms)),
            "totalArea": round(sum(areas), 3),
            "totalPerimeter": round(sum(perimeters), 3),
        },
        "furniture": {"count": float(len(state.get("furniture", [])))},
        "dimensionLines": {"count": float(len(state.get("dimensionLines", [])))},
        "labels": {"count": float(len(state.get("labels", [])))},
    }


def _flatten(value: Mapping[str, Any], prefix: str = "") -> dict[str, float]:
    flat: dict[str, float] = {}
    for key, sub in value.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(sub, Mapping):
            flat.update(_flatten(sub, path))
        else:
            flat[path] = float(sub)
    return flat


def metric_deltas(
    expected_summary: Mapping[str, Any],
    actual_summary: Mapping[str, Any],
    tolerance: float = METRIC_TOLERANCE,
) -> list[Failure]:
    """Compare two geometry summaries; every breach becomes a Failure."""
    expected_flat = _flatten(dict(expected_summary))
    actual_flat = _flatten(dict(actual_summary))
    deltas: list[Failure] = []
    for key in sorted(expected_flat):
        if key not in actual_flat:
            deltas.append(Failure(f"metrics.{key}", "missing", expected=expected_flat[key]))
            continue
        delta = abs(expected_flat[key] - actual_flat[key])
        if delta > tolerance + 1e-9:
            deltas.append(
                Failure(
                    f"metrics.{key}",
                    "mismatch",
                    expected=expected_flat[key],
                    actual=actual_flat[key],
                    delta=round(delta, 6),
                )
            )
    for key in sorted(actual_flat):
        if key not in expected_flat:
            deltas.append(Failure(f"metrics.{key}", "extra", actual=actual_flat[key]))
    return deltas
