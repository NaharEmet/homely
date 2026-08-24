"""Markdown rendering of a suite aggregate, with verbosity levels.

- level 0: verdict table only
- level 1 (default): per-scenario sections pinpointing each failure
  (path / expected / actual / delta / objectId) plus assertion outcomes
- level 2: everything in level 1 as full JSON blocks, including metric
  deltas and raw comparison details for triage
"""

from __future__ import annotations

import json
from typing import Any

_VERDICT = {True: "PASS", False: "FAIL"}


def render_report(aggregate: dict[str, Any], *, level: int = 1) -> str:
    lines: list[str] = []
    totals = aggregate["totals"]
    verdict = _VERDICT[bool(aggregate["ok"])]
    lines.append(f"# Equivalence suite — {verdict}")
    lines.append("")
    lines.append(f"- Run: `{aggregate['runId']}`")
    lines.append(
        f"- Scenarios: {totals['scenarios']} "
        f"({totals['passed']} passed, {totals['failed']} failed, {totals['skipped']} skipped)"
    )
    lines.append("")

    lines.append("| Scenario | Verdict | State diffs | Assertion fails | Steps |")
    lines.append("| --- | --- | --- | --- | --- |")
    for scenario in aggregate["scenarios"]:
        if scenario["skipped"]:
            lines.append(
                f"| [{scenario['name']}]({scenario['artifactsDir'] or scenario['path']}) "
                f"| SKIP | – | – | – |"
            )
            continue
        lines.append(
            f"| {scenario['name']} "
            f"| {_VERDICT[scenario['ok']]} "
            f"| {scenario['stateFailures']} "
            f"| {scenario['assertionFailures']} "
            f"| {scenario['stepsCompared']} |"
        )
    lines.append("")

    if level == 0:
        return "\n".join(lines)

    for scenario in aggregate["scenarios"]:
        if scenario["skipped"]:
            lines.append(f"## {scenario['name']}")
            lines.append("")
            lines.append(f"Skipped: {scenario['skipped']}")
            lines.append("")
            continue
        lines.append(f"## {scenario['name']} — {_VERDICT[scenario['ok']]}")
        lines.append("")
        if scenario["orchestratorErrors"]:
            lines.append("### Orchestrator errors")
            lines.append("")
            for error in scenario["orchestratorErrors"]:
                lines.append(f"- `{json.dumps(error, sort_keys=True)}`")
            lines.append("")
        failure_lines = _failure_lines(scenario["topFailures"])
        if failure_lines:
            lines.append("### Failures")
            lines.append("")
            lines.extend(failure_lines)
            lines.append("")
        elif not scenario["ok"] and scenario["assertionFailures"] == 0:
            lines.append("Failed without recorded failures (see comparison.json).")
            lines.append("")
        if level >= 2:
            lines.append("<details><summary>Raw top-failures JSON</summary>")
            lines.append("")
            lines.append("```json")
            lines.append(json.dumps(scenario["topFailures"], indent=2))
            lines.append("```")
            lines.append("</details>")
            lines.append("")
    return "\n".join(lines)


def _failure_lines(top_failures: list[dict[str, Any]]) -> list[str]:
    lines = []
    for failure in top_failures:
        where = f"step {failure['step']} [{failure['adapter']}]"
        path = failure.get("path", "?")
        expected = _fmt(failure.get("expected"))
        actual = _fmt(failure.get("actual"))
        delta = f" Δ{failure['delta']}" if "delta" in failure else ""
        object_id = f" object={failure['objectId']}" if failure.get("objectId") else ""
        lines.append(
            f"- `{path}` at {where}: expected {expected}, got {actual}{delta}{object_id}"
        )
    return lines


def _fmt(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, str):
        return f"'{value}'"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return repr(value)
    return f"`{json.dumps(value)}`"
