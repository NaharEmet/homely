"""Evaluation of scenario assertions against captured artifacts.

Assertions come from the scenario DSL (C1) and are mirrored into
``manifest.json`` by the orchestrator. State assertions are evaluated per
adapter against ``states/<adapter>/step-<at>.json``; screenshot artifacts only
support ``exists`` until the visual-diff comparator (C5) lands.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Any

_EPS = 1e-9


def resolve_path(document: Any, dotted: str) -> tuple[bool, Any]:
    """Resolve a dotted path like ``walls.0.xStart`` or ``walls[0].xStart``.

    Returns ``(found, value)``; ``found`` is False when any segment is absent
    or an index is out of range.
    """
    current = document
    for raw in dotted.replace("[", ".").replace("]", "").split("."):
        if not raw:
            continue
        if isinstance(current, Sequence) and not isinstance(current, (str, bytes)):
            try:
                index = int(raw)
            except ValueError:
                return False, None
            if not 0 <= index < len(current):
                return False, None
            current = current[index]
        elif isinstance(current, Mapping):
            if raw not in current:
                return False, None
            current = current[raw]
        else:
            return False, None
    return True, current


def _bool_int_clash(expected: Any, actual: Any) -> bool:
    return isinstance(expected, bool) != isinstance(actual, bool)


def evaluate_assertion(
    assertion: Mapping[str, Any],
    artifacts_dir: Any,
    adapters: Sequence[str],
) -> dict[str, Any]:
    """Evaluate one assertion for every adapter; returns a record dict."""
    at = assertion["at"]
    artifact = assertion.get("artifact", "state")
    kind = assertion["kind"]
    path = assertion["path"]
    value = assertion.get("value")
    tolerance = float(assertion.get("tolerance", 0.01))

    records: dict[str, Any] = {
        "at": at,
        "artifact": artifact,
        "kind": kind,
        "path": path,
        "expected": value if kind != "exists" else "non-null",
        "perAdapter": [],
    }
    passed = True
    for adapter in adapters:
        record: dict[str, Any] = {"adapter": adapter}
        if artifact == "state":
            state_file = f"states/{adapter}/step-{at}.json"
            try:
                with open(artifacts_dir / state_file, encoding="utf-8") as fh:
                    document = json.load(fh)
            except FileNotFoundError:
                record.update(status="error", message=f"missing artifact {state_file}")
                records["perAdapter"].append(record)
                passed = False
                continue
            found, actual = resolve_path(document, path)
            status, extra = _check(kind, path, value, tolerance, found, actual)
            record.update(extra)
            record["status"] = status
        else:
            png = artifacts_dir / "screenshots" / adapter / f"step-{at}-{artifact}.png"
            if kind == "exists":
                ok = png.is_file() and png.stat().st_size > 0
                record.update(status="pass" if ok else "fail", actual=str(png.name))
                if not ok:
                    passed = False
            else:
                record.update(
                    status="unsupported",
                    message=f"'{kind}' on '{artifact}' needs C5 visual-diff",
                )
        if record["status"] != "pass":
            passed = False
        records["perAdapter"].append(record)

    records["passed"] = passed
    return records


def _check(
    kind: str,
    path: str,
    value: Any,
    tolerance: float,
    found: bool,
    actual: Any,
) -> tuple[str, dict[str, Any]]:
    if kind == "exists":
        ok = found and actual is not None
        return ("pass" if ok else "fail"), {"actual": actual}
    if not found:
        return "error", {"message": f"path '{path}' not found in captured state"}
    if kind == "count":
        if not isinstance(actual, list):
            return "fail", {"actual": actual, "message": "count target is not a list"}
        ok = len(actual) == value
        return ("pass" if ok else "fail"), {"actual": len(actual)}
    if kind == "equals":
        if _bool_int_clash(value, actual):
            return "fail", {"actual": actual}
        ok = actual == value
        return ("pass" if ok else "fail"), {"actual": actual}
    if kind == "approx":
        if not isinstance(actual, (int, float)) or isinstance(actual, bool):
            return "fail", {"actual": actual, "message": "approx target is not numeric"}
        delta = abs(float(actual) - float(value))
        ok = delta <= tolerance + _EPS
        return ("pass" if ok else "fail"), {"actual": actual, "delta": round(delta, 6)}
    return "error", {"message": f"unknown assertion kind '{kind}'"}


def evaluate_assertions(
    assertions: Sequence[Mapping[str, Any]],
    artifacts_dir: Any,
    adapters: Sequence[str],
) -> dict[str, Any]:
    """Evaluate all manifest assertions; returns ``{records, passed, counts}``."""
    records = [evaluate_assertion(a, artifacts_dir, adapters) for a in assertions]
    failures = sum(1 for r in records if not r["passed"])
    errors = sum(
        1
        for r in records
        for per in r["perAdapter"]
        if per["status"] in ("error", "unsupported")
    )
    return {
        "records": records,
        "passed": failures == 0 and errors == 0,
        "counts": {"total": len(records), "failed": failures, "errors": errors},
    }
