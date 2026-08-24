"""Demo entry point for C2 DoD: execute a scenario YAML against two
MockAdapters (sh3d + tauri) and produce an artifacts directory.

Usage:
    .venv/bin/python -m eq.adapters.demo [path/to/scenario.yaml]
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from eq.adapters.orchestrator import REPO_ROOT, Orchestrator, RunResult, build_mock_adapters
from eq.dsl.loader import load_scenario

DEFAULT_SCENARIO = REPO_ROOT / "equivalence" / "scenarios" / "walls" / "create_room.yaml"


async def _run(scenario_path: Path, results_root: Path | None) -> RunResult:
    scenario = load_scenario(scenario_path)
    adapters = build_mock_adapters(scenario)
    return await Orchestrator(scenario, adapters, results_root=results_root).run()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a scenario against mock adapters")
    parser.add_argument("scenario", nargs="?", default=str(DEFAULT_SCENARIO), help="scenario YAML path")
    parser.add_argument("--results-root", default=None, help="artifacts root (default: repo results/)")
    args = parser.parse_args(argv)

    scenario_path = Path(args.scenario)
    if not scenario_path.is_absolute():
        scenario_path = Path.cwd() / scenario_path
    results_root = Path(args.results_root) if args.results_root else None

    result = asyncio.run(_run(scenario_path, results_root))
    print(f"scenario : {result.run_id}")
    print(f"ok       : {result.ok} ({len(result.errors)} errors)")
    print(f"artifacts: {result.artifacts_dir}")
    return 0 if result.ok else 1


if __name__ == "__main__":
    sys.exit(main())
