"""Suite runner: execute scenarios, compare artifacts, aggregate results.

A suite invocation creates one container directory under the results root
(``<YYYYmmdd-HHMMSS>-suite``) and runs every discovered scenario through the
C2 orchestrator (mock-backed by default) and the C3 comparators. The
container holds per-scenario orchestrator artifact trees plus top-level
``summary.json`` and ``report.md``.

Live mode (``--live`` / ``target="live"``) swaps mocks for the C6 live
adapters against real apps. Operator launch steps:

1. Start the SH3D driver and point the harness at its FramedServer::

       cd equivalence/driver-java && DISPLAY=:1 ./run.sh <port>
       export EQ_SH3D_PORT=<port>        # default 9440; EQ_SH3D_HOST for host

2. Launch the suite — it binds an AutomationServer on ephemeral ports and
   prints the WebSocket port to stderr::

       ./test-equivalence <scenarios> --live

3. Start homely against that port (ws-protocol v1 hello ``app:"homely"`)::

       cd homely && HOMELY_AUTOMATION_PORT=<ws-port> npm run tauri dev

The runner then waits for BOTH hellos concurrently — ``sh3d-driver`` over a
framed TCP connection out to the driver's FramedServer, ``homely`` adopted
from the AutomationServer — before running scenarios, and tears down every
connection even when sessions never arrive.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import sys
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from eq.adapters import (
    Adapter,
    AutomationServer,
    HomelyAdapter,
    MockAdapter,
    Orchestrator,
    Sh3dAdapter,
)
from eq.comparators import write_comparison
from eq.dsl import Scenario, load_scenario

REPO_ROOT = Path(__file__).parents[3]
DEFAULT_RESULTS_ROOT = REPO_ROOT / "results"
SUITE_SCHEMA_VERSION = 1
LIVE_SESSION_TIMEOUT = 300.0  # npm run tauri dev can take minutes on a cold cache


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


def _skip_reason(scenario: Scenario) -> str:
    return (
        f"target mismatch: scenario targets "
        f"os={list(scenario.target.os)} mode={list(scenario.target.mode)}"
    )


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
        outcome.skipped = _skip_reason(scenario)
        return outcome

    result = asyncio.run(Orchestrator(scenario, adapters, results_root).run())
    _fill_outcome(outcome, result, results_root)
    return outcome


def _fill_outcome(outcome: ScenarioOutcome, result: Any, results_root: Path) -> None:
    """Copy a completed orchestrator run + comparison into ``outcome``."""
    comparison = write_comparison(result.artifacts_dir)
    outcome.artifacts_dir = str(result.artifacts_dir.relative_to(results_root))
    summary = comparison["summary"]
    outcome.state_failures = summary["stateFailures"]
    outcome.assertion_failures = summary["assertionFailures"]
    outcome.steps_compared = summary["stepsCompared"]
    outcome.orchestrator_errors = list(result.errors or [])
    outcome.top_failures = _top_failures(comparison)
    outcome.ok = bool(comparison["ok"]) and not outcome.orchestrator_errors


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


async def _run_live_scenario(
    scenario_path: Path,
    results_root: Path,
    adapters: Mapping[str, Adapter],
    *,
    os_filter: set[str] | None = None,
    mode_filter: set[str] | None = None,
) -> ScenarioOutcome:
    """One scenario against the shared live adapter map (single event loop)."""
    scenario = load_scenario(scenario_path)
    outcome = ScenarioOutcome(
        name=scenario.name,
        slug=_slug(scenario.name),
        path=str(scenario_path),
    )
    # Reuse the mock adapter-set builder purely as the platform skip check:
    # a scenario the requested os/mode filters would skip in mock mode is
    # skipped here too; the returned mocks themselves are discarded.
    if build_adapters(scenario, os_filter, mode_filter) is None:
        outcome.skipped = _skip_reason(scenario)
        return outcome
    result = await Orchestrator(scenario, adapters, results_root).run()
    _fill_outcome(outcome, result, results_root)
    return outcome


async def _run_live_suite(
    scenario_files: list[Path],
    results_root: Path,
    *,
    os_filter: set[str] | None = None,
    mode_filter: set[str] | None = None,
    session_timeout: float = LIVE_SESSION_TIMEOUT,
    server: AutomationServer | None = None,
) -> list[ScenarioOutcome]:
    """Run every scenario against one pair of live app sessions.

    Starts an AutomationServer on ephemeral ports (or adopts ``server``, for
    tests that pre-wire fake transports), connects out to the SH3D
    driver's FramedServer (``EQ_SH3D_HOST``/``EQ_SH3D_PORT``, operator steps in
    the module docstring), concurrently waits for both hellos —
    ``sh3d-driver`` and ``homely`` — then runs all scenarios through the fixed
    live adapter map ``{"sh3d", "tauri"}``. Teardown of adapters + server runs
    even when session wait or a scenario fails.
    """
    server = server or AutomationServer()
    await server.start()
    print(
        f"[live] automation server ready — start homely with "
        f"HOMELY_AUTOMATION_PORT={server.ws_port} npm run tauri dev",
        file=sys.stderr,
    )
    sh3d = Sh3dAdapter(
        "sh3d",
        host=os.environ.get("EQ_SH3D_HOST", "127.0.0.1"),
        port=int(os.environ.get("EQ_SH3D_PORT", "9440")),
    )
    tauri = HomelyAdapter("tauri", server, app="homely", timeout=session_timeout)
    # Platform skips need no live sessions: resolve them before starting
    # adapters so a skip-only suite never dials the driver or waits for homely.
    runnable: list[Path] = []
    outcomes: list[ScenarioOutcome] = []
    for f in scenario_files:
        scenario = load_scenario(f)
        if build_adapters(scenario, os_filter, mode_filter) is None:
            outcomes.append(
                ScenarioOutcome(
                    name=scenario.name,
                    slug=_slug(scenario.name),
                    path=str(f),
                    skipped=_skip_reason(scenario),
                )
            )
        else:
            runnable.append(f)
    try:
        adapters: dict[str, Adapter] = {}
        if runnable:
            await asyncio.wait_for(asyncio.gather(sh3d.start(), tauri.start()), session_timeout)
            print("[live] sh3d-driver and homely sessions connected", file=sys.stderr)
            adapters = {"sh3d": sh3d, "tauri": tauri}
        outcomes.extend(
            [
                await _run_live_scenario(f, results_root, adapters)
                for f in runnable
            ]
        )
        return outcomes
    finally:
        for stop in (sh3d.stop, tauri.stop, server.stop):
            with contextlib.suppress(Exception):
                await stop()


def run_suite(
    paths: str | Path | list[str | Path],
    results_root: str | Path = DEFAULT_RESULTS_ROOT,
    *,
    os_filter: set[str] | None = None,
    mode_filter: set[str] | None = None,
    level: int = 1,
    target: str = "mock",
) -> dict[str, Any]:
    """Discover scenarios, run them all, persist ``summary.json`` + ``report.md``.

    Returns the same aggregate dictionary that is persisted, so callers can
    assert on it directly (the CLI uses ``ok`` as its exit code).

    ``target="mock"`` (default) uses MockAdapter-backed orchestrators;
    ``target="live"`` runs against real apps over the C6 live adapters — see
    the module docstring for operator launch steps.
    """
    from eq.reporting.report import render_report  # local import avoids a cycle

    if target not in ("mock", "live"):
        raise ValueError(f"unknown target: {target!r} (expected 'mock' or 'live')")

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

    if target == "live":
        outcomes = asyncio.run(
            _run_live_suite(scenario_files, container, os_filter=os_filter, mode_filter=mode_filter)
        )
    else:
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
        "target": target,
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
