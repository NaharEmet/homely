"""Suite runner: execute scenarios, compare artifacts, aggregate results.

A suite invocation creates one container directory under the results root
(``<YYYYmmdd-HHMMSS>-suite``) and runs every discovered scenario through the
C2 orchestrator (mock-backed by default) and the C3 comparators. The
container holds per-scenario orchestrator artifact trees plus top-level
``summary.json`` and ``report.md``.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from eq.adapters import MockAdapter, Orchestrator
from eq.comparators import write_comparison
from eq.dsl import Scenario, load_scenario

REPO_ROOT = Path(__file__).parents[3]
DEFAULT_RESULTS_ROOT = REPO_ROOT / "results"
SUITE_SCHEMA_VERSION = 1


@dataclass
class ScenarioOutcome:
    """Per-scenario verdict for the aggregate summary."""

    name: str
    slug: str
    path: str
    ok: bool = False
    skipped: str | None = None
    artifacts_dir: str | None = None
    state_failures: int = 0
    assertion_failures: int = 0
    steps_compared: int = 0
    orchestrator_errors: list[dict[str, Any]] = field(default_factory=list)
    top_failures: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "slug": self.slug,
            "path": self.path,
            "ok": self.ok,
            "skipped": self.skipped,
            "artifactsDir": self.artifacts_dir,
            "stateFailures": self.state_failures,
            "assertionFailures": self.assertion_failures,
            "stepsCompared": self.steps_compared,
            "orchestratorErrors": self.orchestrator_errors,
            "topFailures": self.top_failures,
        }


def discover_scenarios(path: str | Path) -> list[Path]:
    """A file passes through; a directory yields its ``*.yaml``/``*.yml`` tree."""
    target = Path(path)
    if target.is_file():
        return [target]
    if not target.is_dir():
        raise FileNotFoundError(f"scenario path not found: {target}")
    return sorted({*target.rglob("*.yaml"), *target.rglob("*.yml")})


def _slug(name: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-") or "scenario"


def build_adapters(
    scenario: Scenario,
    os_filter: set[str] | None = None,
    mode_filter: set[str] | None = None,
) -> dict[str, MockAdapter] | None:
    """Mock adapter set restricted to the requested platform, or None to skip.

    ``os_filter``/``mode_filter`` are ``None`` for "no restriction"; an empty
    intersection with the scenario's declared target skips the scenario.
    """
    if os_filter and not os_filter.intersection(scenario.target.os):
        return None
    modes = [
        m
        for m in scenario.target.mode
        if not mode_filter or m in mode_filter
    ]
    if not modes:
        return None
    adapters: dict[str, MockAdapter] = {"sh3d": MockAdapter(name="sh3d")}
    for mode in modes:
        adapters.setdefault(mode, MockAdapter(name=mode))
    return adapters


def run_scenario(
    scenario_path: Path,
    results_root: Path,
    *,
    os_filter: set[str] | None = None,
    mode_filter: set[str] | None = None,
) -> ScenarioOutcome:
    """Run one scenario file end-to-end and compare its artifacts."""
    scenario = load_scenario(scenario_path)
    outcome = ScenarioOutcome(
        name=scenario.name,
        slug=_slug(scenario.name),
        path=str(scenario_path),
    )
    adapters = build_adapters(scenario, os_filter, mode_filter)
    if adapters is None:
        outcome.skipped = (
            f"target mismatch: scenario targets "
            f"os={list(scenario.target.os)} mode={list(scenario.target.mode)}"
        )
        return outcome

    orchestrator = Orchestrator(scenario, adapters, results_root)
    result = asyncio.run(orchestrator.run())
    comparison = write_comparison(result.artifacts_dir)
    outcome.artifacts_dir = str(result.artifacts_dir.relative_to(results_root))
    summary = comparison["summary"]
    outcome.state_failures = summary["stateFailures"]
    outcome.assertion_failures = summary["assertionFailures"]
    outcome.steps_compared = summary["stepsCompared"]
    outcome.orchestrator_errors = list(result.errors or [])
    outcome.top_failures = _top_failures(comparison)
    outcome.ok = bool(comparison["ok"]) and not outcome.orchestrator_errors
    return outcome


def _top_failures(comparison: dict[str, Any], limit: int = 10) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for entry in comparison.get("comparedSteps", []):
        step = entry["step"]
        for target in entry.get("targets", []):
            for failure in target.get("failures", []):
                flat.append({"step": step, "adapter": target["target"], **failure})
    for record in comparison.get("assertions", {}).get("records", []):
        for per in record.get("perAdapter", []):
            if per.get("status") != "fail":
                continue
            item: dict[str, Any] = {
                "step": record["at"],
                "adapter": per["adapter"],
                "kind": f"assertion-{record['kind']}",
                "path": record["path"],
                "expected": record["expected"],
                "actual": per.get("actual"),
            }
            if "delta" in per:
                item["delta"] = per["delta"]
            flat.append(item)
    return flat[:limit]


def run_suite(
    paths: str | Path | list[str | Path],
    results_root: str | Path = DEFAULT_RESULTS_ROOT,
    *,
    os_filter: set[str] | None = None,
    mode_filter: set[str] | None = None,
    level: int = 1,
) -> dict[str, Any]:
    """Discover scenarios, run them all, persist ``summary.json`` + ``report.md``.

    Returns the same aggregate dictionary that is persisted, so callers can
    assert on it directly (the CLI uses ``ok`` as its exit code).
    """
    from eq.reporting.report import render_report  # local import avoids a cycle

    if not isinstance(paths, list):
        paths = [paths]
    scenario_files: list[Path] = []
    for path in paths:
        scenario_files.extend(discover_scenarios(path))
    if not scenario_files:
        raise ValueError(f"no scenarios found in {paths}")

    root = Path(results_root)
    root.mkdir(parents=True, exist_ok=True)
    started_at = datetime.now(UTC)
    container = root / f"{started_at.strftime('%Y%m%d-%H%M%S')}-suite"
    container.mkdir(parents=True)

    outcomes = [
        run_scenario(f, container, os_filter=os_filter, mode_filter=mode_filter)
        for f in scenario_files
    ]

    passed = sum(1 for o in outcomes if o.ok)
    failed = sum(1 for o in outcomes if not o.skipped and not o.ok)
    skipped = sum(1 for o in outcomes if o.skipped)
    aggregate = {
        "schemaVersion": SUITE_SCHEMA_VERSION,
        "runId": container.name,
        "startedAt": started_at.isoformat(),
        "finishedAt": datetime.now(UTC).isoformat(),
        "level": level,
        "ok": failed == 0,
        "totals": {
            "scenarios": len(outcomes),
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
        },
        "scenarios": [o.to_dict() for o in outcomes],
    }
    report = render_report(aggregate, level=level)
    (container / "summary.json").write_text(json.dumps(aggregate, indent=2), encoding="utf-8")
    (container / "report.md").write_text(report, encoding="utf-8")
    return aggregate
