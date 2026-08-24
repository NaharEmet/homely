"""Artifact-level comparison: turn one orchestrator run into a verdict.

Reads ``manifest.json``, ``ledger.json`` and the captured states from a run
directory (see :mod:`eq.adapters.orchestrator`), pairs adapters (``sh3d``
is the reference when present), diffs every state checkpoint via the ledger
id map, evaluates scenario assertions and writes ``comparison.json``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from eq.comparators.assertions import evaluate_assertions
from eq.comparators.diff import Failure, compare_states
from eq.comparators.match import build_id_map
from eq.comparators.metrics import geometry_summary, metric_deltas

COMPARISON_SCHEMA_VERSION = 1


def _load(path: Path) -> Any:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def compare_artifacts(artifacts_dir: str | Path) -> dict[str, Any]:
    """Compare all captured states + assertions of one run directory."""
    run_dir = Path(artifacts_dir)
    manifest = _load(run_dir / "manifest.json")
    ledger_path = run_dir / "ledger.json"
    ledger: list[dict[str, Any]] = _load(ledger_path) if ledger_path.is_file() else []

    adapters: list[str] = list(manifest.get("adapters", []))
    reference = "sh3d" if "sh3d" in adapters else (adapters[0] if adapters else None)

    compared: list[dict[str, Any]] = []
    total_failures = 0
    checkpoints = manifest.get("checkpoints", [])
    for checkpoint in sorted(checkpoints, key=lambda cp: cp["afterStep"]):
        if "state" not in checkpoint.get("capture", ["state"]):
            continue
        step = checkpoint["afterStep"]
        entry: dict[str, Any] = {"step": step, "reference": reference, "targets": []}
        if reference is None:
            entry["skipped"] = "no adapters recorded"
            compared.append(entry)
            continue
        ref_path = run_dir / "states" / reference / f"step-{step}.json"
        if not ref_path.is_file():
            entry["skipped"] = f"missing {ref_path.name} for reference '{reference}'"
            compared.append(entry)
            continue
        expected_state = _load(ref_path)

        failures: list[dict[str, Any]] = []
        metric_failures: list[dict[str, Any]] = []
        for adapter in adapters:
            if adapter == reference:
                continue
            target_path = run_dir / "states" / adapter / f"step-{step}.json"
            if not target_path.is_file():
                entry["targets"].append(
                    {"target": adapter, "skipped": f"missing {target_path.name}"}
                )
                continue
            actual_state = _load(target_path)
            id_map = build_id_map(
                expected_state,
                actual_state,
                [e for e in ledger if e["step"] <= step],
                adapter_a=reference,
                adapter_b=adapter,
            )
            step_failures = compare_states(expected_state, actual_state, id_map)
            metrics = metric_deltas(geometry_summary(expected_state), geometry_summary(actual_state))
            total_failures += len(step_failures) + len(metrics)
            entry["targets"].append(
                {
                    "target": adapter,
                    "failureCount": len(step_failures),
                    "failures": [f.to_dict() for f in step_failures],
                    "metricDeltas": [f.to_dict() for f in metrics],
                }
            )
            failures.extend(entry["targets"][-1]["failures"])
            metric_failures.extend(entry["targets"][-1]["metricDeltas"])
        compared.append(entry)

    assertions = evaluate_assertions(manifest.get("assertions", []), run_dir, adapters)
    assertion_failures = sum(
        1 for r in assertions["records"] for per in r["perAdapter"] if per["status"] == "fail"
    )

    return {
        "schemaVersion": COMPARISON_SCHEMA_VERSION,
        "runId": manifest.get("runId"),
        "scenarioName": manifest.get("scenarioName"),
        "referenceAdapter": reference,
        "ok": total_failures == 0 and assertions["passed"],
        "comparedSteps": compared,
        "assertions": assertions,
        "summary": {
            "stateFailures": total_failures,
            "assertionFailures": assertion_failures,
            "stepsCompared": len([c for c in compared if c.get("targets")]),
        },
    }


def write_comparison(artifacts_dir: str | Path) -> dict[str, Any]:
    """Compare a run directory and persist ``comparison.json`` beside it."""
    result = compare_artifacts(artifacts_dir)
    out = Path(artifacts_dir) / "comparison.json"
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


__all__ = [
    "Failure",
    "compare_artifacts",
    "write_comparison",
]
