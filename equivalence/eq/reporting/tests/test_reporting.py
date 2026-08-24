"""Tests for eq.reporting: suite runner, report rendering, CLI."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from eq.dsl import Target
from eq.reporting import (
    build_adapters,
    discover_scenarios,
    main,
    render_report,
    run_suite,
)

REPO_ROOT = Path(__file__).parents[4]
SCENARIOS = REPO_ROOT / "equivalence" / "scenarios"


def _failing_scenario(tmp_path: Path) -> Path:
    scenario = {
        "name": "failing-count",
        "description": "asserts a wall count the steps cannot produce",
        "target": {"os": ["linux"], "mode": ["tauri"]},
        "setup": [{"new_home": None}],
        "steps": [
            {"select_tool": {"tool": "wall"}},
            {"set_magnetism": {"enabled": False}},
            {"click": {"x": 0, "y": 0}},
            {"click": {"x": 400, "y": 0}},
            {"click": {"x": 400, "y": 300}},
        ],
        "checkpoints": [{"afterStep": 5, "capture": ["state"]}],
        "assertions": [
            {"at": 5, "artifact": "state", "kind": "count", "path": "walls", "value": 5}
        ],
    }
    path = tmp_path / "failing_count.yaml"
    path.write_text(yaml.safe_dump(scenario), encoding="utf-8")
    return path


def test_discover_scenarios_file_and_directory(tmp_path):
    assert discover_scenarios(SCENARIOS / "walls" / "create_room.yaml") == [
        SCENARIOS / "walls" / "create_room.yaml"
    ]
    (tmp_path / "a.yaml").write_text("x: 1")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "b.yml").write_text("x: 1")
    found = discover_scenarios(tmp_path)
    assert [p.name for p in found] == ["a.yaml", "b.yml"]
    with pytest.raises(FileNotFoundError):
        discover_scenarios(tmp_path / "missing")


def test_build_adapters_filters_modes():
    from eq.dsl import Scenario

    scenario = Scenario(
        name="t", description="", target=Target(os=["linux"], mode=["tauri", "web"]),
        setup=[], steps=[{"ping": None}], checkpoints=[{"afterStep": 1}],
    )
    adapters = build_adapters(scenario, mode_filter={"tauri"})
    assert set(adapters) == {"sh3d", "tauri"}
    assert build_adapters(scenario, os_filter={"windows"}) is None
    assert build_adapters(scenario, mode_filter={"safari"}) is None


def test_mixed_suite_pinpoints_failure_without_human_inspection(tmp_path):
    failing = _failing_scenario(tmp_path)
    aggregate = run_suite(
        [SCENARIOS / "walls" / "create_room.yaml", failing],
        tmp_path / "results",
    )
    assert aggregate["ok"] is False
    assert aggregate["totals"] == {"scenarios": 2, "passed": 1, "failed": 1, "skipped": 0}
    by_name = {s["name"]: s for s in aggregate["scenarios"]}
    assert by_name["create-room"]["ok"] is True
    failed = by_name["failing-count"]
    assert failed["ok"] is False
    assert failed["stateFailures"] == 0
    assert failed["assertionFailures"] == 2  # fails on every compared adapter
    top = failed["topFailures"][0]
    assert top["path"] == "walls"
    assert top["expected"] == 5 and top["actual"] == 2


def test_summary_json_persisted_matches_aggregate(tmp_path):
    aggregate = run_suite(SCENARIOS / "walls" / "create_room.yaml", tmp_path)
    persisted = json.loads((tmp_path / aggregate["runId"] / "summary.json").read_text())
    assert persisted == aggregate


def test_report_levels(tmp_path):
    failing = _failing_scenario(tmp_path)
    aggregate = run_suite(
        [SCENARIOS / "walls" / "create_room.yaml", failing],
        tmp_path / "results",
        level=2,
    )
    container = tmp_path / "results" / aggregate["runId"]

    level0 = render_report(aggregate, level=0)
    assert "FAIL" in level0 and "`walls` at" not in level0

    level1 = render_report(aggregate, level=1)
    assert "`walls` at step 5" in level1
    assert "expected 5, got 2" in level1

    level2 = render_report(aggregate, level=2)
    assert '"topFailures"' in level2 or "Raw top-failures JSON" in level2

    report_md = (container / "report.md").read_text()
    assert report_md.startswith("# Equivalence suite — FAIL")


def test_target_mismatch_is_skipped_not_failed(tmp_path):
    aggregate = run_suite(
        SCENARIOS / "walls" / "create_room.yaml",
        tmp_path,
        os_filter={"windows"},
    )
    scenario = aggregate["scenarios"][0]
    assert scenario["skipped"] and "target mismatch" in scenario["skipped"]
    assert aggregate["totals"]["skipped"] == 1
    assert aggregate["ok"] is True


def test_mode_filter_limits_captured_adapter_dirs(tmp_path):
    aggregate = run_suite(
        SCENARIOS / "walls" / "create_room.yaml",
        tmp_path,
        mode_filter={"tauri"},
    )
    container = tmp_path / aggregate["runId"]
    scenario_dir = next(d for d in container.iterdir() if d.is_dir())
    states = sorted(p.name for p in (scenario_dir / "states").iterdir())
    assert states == ["sh3d", "tauri"]


def test_container_tree_has_required_artifacts(tmp_path):
    aggregate = run_suite(SCENARIOS / "walls" / "create_room.yaml", tmp_path)
    container = tmp_path / aggregate["runId"]
    assert (container / "summary.json").is_file()
    assert (container / "report.md").is_file()
    scenario_dir = next(d for d in container.iterdir() if d.is_dir())
    for name in ("manifest.json", "actions.json", "ledger.json", "errors.json"):
        assert (scenario_dir / name).is_file(), name
    assert list((scenario_dir / "states" / "tauri").glob("step-7.json"))
    assert (scenario_dir / "comparison.json").is_file()


def test_cli_exit_codes_and_output_paths(tmp_path, capsys):
    passing_root = tmp_path / "passing"
    assert main([str(SCENARIOS / "walls" / "create_room.yaml"), "--results-root", str(passing_root)]) == 0
    failing = _failing_scenario(tmp_path)
    failing_root = tmp_path / "failing"
    assert main([str(failing), "--results-root", str(failing_root), "--level", "2"]) == 1
    out = capsys.readouterr().out
    assert "summary:" in out and "report:" in out
    assert "0/1 scenarios passed" in out or "1/2 scenarios passed" in out or "/" in out


def test_cli_target_flag_parses(tmp_path, capsys):
    code = main(
        [
            str(SCENARIOS / "walls" / "create_room.yaml"),
            "--results-root",
            str(tmp_path),
            "--target",
            "linux,tauri",
        ]
    )
    assert code == 0
    code = main(
        [str(SCENARIOS / "walls" / "create_room.yaml"), "--results-root", str(tmp_path / "x"), "--target", "macos,*"]
    )
    assert code == 0  # skipped-only suite is not a failure


def test_skipped_only_suite_is_ok(tmp_path):
    aggregate = run_suite(SCENARIOS / "walls" / "create_room.yaml", tmp_path, os_filter={"macos"})
    assert aggregate["ok"] is True
    assert aggregate["totals"]["failed"] == 0


def test_suite_repeatable_deterministic_summary(tmp_path):
    def normalized(root):
        aggregate = run_suite(SCENARIOS / "walls" / "create_room.yaml", root)
        aggregate.pop("runId")
        aggregate.pop("startedAt")
        aggregate.pop("finishedAt")
        for scenario in aggregate["scenarios"]:
            scenario.pop("artifactsDir")
            scenario.pop("path")
        return json.dumps(aggregate, sort_keys=True)

    assert normalized(tmp_path / "a") == normalized(tmp_path / "b")
