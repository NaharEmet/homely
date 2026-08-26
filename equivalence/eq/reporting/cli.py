"""``python -m eq.reporting`` CLI and the repo-root ``test-equivalence`` tool.

Examples::

    python -m eq.reporting equivalence/scenarios/walls/create_room.yaml
    ./test-equivalence equivalence/scenarios --level 2 --target linux,tauri
    ./test-equivalence equivalence/scenarios/walls/create_room.yaml --live

Exit code 0 only when every non-skipped scenario passes.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from eq.reporting.runner import DEFAULT_RESULTS_ROOT, run_suite


def _parse_target(value: str | None) -> tuple[set[str] | None, set[str] | None]:
    """``--target linux,tauri`` → ({"linux"}, {"tauri"}); ``*`` means all."""
    if not value:
        return None, None
    parts = [p.strip() for p in value.split(",")]
    while len(parts) < 2:
        parts.append("*")
    os_part, mode_part = parts[0], parts[1]
    os_filter = None if os_part in ("", "*") else {os_part}
    mode_filter = None if mode_part in ("", "*") else {mode_part}
    return os_filter, mode_filter


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="test-equivalence",
        description="Run equivalence scenarios against adapters and report diffs.",
    )
    parser.add_argument("scenario", help="scenario YAML file or directory of scenarios")
    parser.add_argument(
        "--results-root",
        type=Path,
        default=DEFAULT_RESULTS_ROOT,
        help=f"suite output root (default: {DEFAULT_RESULTS_ROOT})",
    )
    parser.add_argument(
        "--level",
        type=int,
        choices=(0, 1, 2),
        default=1,
        help="report verbosity (default: 1)",
    )
    parser.add_argument(
        "--target",
        default=None,
        metavar="OS,MODE",
        help="restrict platform, e.g. linux,tauri ('*' = any)",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help=(
            "run against the real SH3D driver + homely app instead of mocks. "
            "Operator steps: (1) cd equivalence/driver-java && DISPLAY=:1 ./run.sh <port>, "
            "then export EQ_SH3D_PORT=<port> (default 9440; EQ_SH3D_HOST for host); "
            "(2) launch this command with --live and note the printed automation "
            "ws-port; (3) in homely/, run HOMELY_AUTOMATION_PORT=<ws-port> npm run tauri dev. "
            "Combines with --target platform filters."
        ),
    )
    args = parser.parse_args(argv)

    os_filter, mode_filter = _parse_target(args.target)
    aggregate = run_suite(
        args.scenario,
        args.results_root,
        os_filter=os_filter,
        mode_filter=mode_filter,
        level=args.level,
        target="live" if args.live else "mock",
    )
    container = Path(args.results_root) / aggregate["runId"]
    totals = aggregate["totals"]
    print(
        f"{totals['passed']}/{totals['scenarios']} scenarios passed "
        f"({totals['failed']} failed, {totals['skipped']} skipped)"
    )
    print(f"summary: {container / 'summary.json'}")
    print(f"report:  {container / 'report.md'}")
    return 0 if aggregate["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
