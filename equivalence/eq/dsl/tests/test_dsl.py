"""C1 dsl — scenario YAML schema + loader tests.

DoD (PLAN.md): pytest covers valid load; every invalid case's error names the
offending step index/path; example scenario walls/create_room.yaml loads.
"""

from pathlib import Path

import pytest

from eq.dsl import (
    Scenario,
    ScenarioLoadError,
    Step,
    load_scenario,
    parse_scenario,
)

REPO_ROOT = Path(__file__).resolve().parents[4]
EXAMPLE = REPO_ROOT / "equivalence" / "scenarios" / "walls" / "create_room.yaml"


def base_scenario() -> dict:
    return {
        "name": "t",
        "steps": [{"ping": None}],
        "checkpoints": [{"afterStep": 1}],
        "assertions": [],
    }


def invalid(scenario: dict) -> ScenarioLoadError:
    with pytest.raises(ScenarioLoadError) as excinfo:
        parse_scenario(scenario)
    return excinfo.value


def test_example_create_room_loads() -> None:
    scenario = load_scenario(EXAMPLE)
    assert scenario.name == "create-room"
    assert len(scenario.steps) == 7
    assert scenario.steps[0] == Step(command="select_tool", params={"tool": "wall"})
    assert scenario.checkpoints[0].afterStep == 7
    assert scenario.checkpoints[0].capture == ["state"]
    assert [a.kind for a in scenario.assertions] == ["count", "exists"]


def test_target_defaults_to_linux_tauri() -> None:
    scenario = parse_scenario(base_scenario())
    assert scenario.target.os == ["linux"]
    assert scenario.target.mode == ["tauri"]


def test_setup_steps_are_validated_like_steps() -> None:
    scenario = parse_scenario(
        {"name": "t", "setup": [{"new_home": None}], "steps": [{"ping": None}]}
    )
    assert scenario.setup[0].command == "new_home"
    err = invalid({"name": "t", "setup": [{"bogus": {}}], "steps": [{"ping": None}]})
    assert "setup[0]" in str(err)


def test_null_params_become_empty_dict() -> None:
    step = Step.model_validate({"undo": None})
    assert step.params == {}


def test_unknown_command_names_step_index() -> None:
    err = invalid(
        {
            "name": "t",
            "steps": [{"ping": None}, {"click": {"x": 1, "y": 2}}, {"cliuck": None}],
        }
    )
    text = "\n".join(err.issues)
    assert "steps[2]" in text
    assert "unknown command 'cliuck'" in text


def test_step_with_two_keys_names_step_index() -> None:
    err = invalid({"name": "t", "steps": [{"ping": None, "undo": None}]})
    assert "steps[0]" in str(err)


def test_missing_required_param_names_step_and_param() -> None:
    err = invalid({"name": "t", "steps": [{"click": {"x": 100}}]})
    text = "\n".join(err.issues)
    assert "steps[0]" in text
    assert "missing required param 'y'" in text


def test_bad_param_type_names_step_and_param() -> None:
    err = invalid({"name": "t", "steps": [{"key": {"key": 3}}]})
    text = "\n".join(err.issues)
    assert "steps[0]" in text
    assert "key.key must be str" in text


def test_bool_rejected_for_numeric_param() -> None:
    err = invalid({"name": "t", "steps": [{"zoom": {"factor": True}}]})
    assert "steps[0]" in str(err)


def test_enum_param_rejects_unknown_value() -> None:
    err = invalid({"name": "t", "steps": [{"select_tool": {"tool": "magic"}}]})
    text = "\n".join(err.issues)
    assert "steps[0]" in text
    assert "'magic' not in" in text


def test_checkpoint_out_of_range_names_checkpoint_index() -> None:
    scenario = base_scenario()
    scenario["checkpoints"] = [{"afterStep": 5}]
    err = invalid(scenario)
    text = "\n".join(err.issues)
    assert "checkpoints[0].afterStep=5" in text
    assert "only 1 steps" in text


def test_duplicate_checkpoints_rejected() -> None:
    scenario = base_scenario()
    scenario["steps"] = [{"ping": None}, {"undo": None}]
    scenario["checkpoints"] = [{"afterStep": 1}, {"afterStep": 1}]
    err = invalid(scenario)
    assert "duplicates an earlier checkpoint" in str(err)


def test_assertion_without_matching_checkpoint_names_assertion_index() -> None:
    scenario = base_scenario()
    scenario["assertions"] = [
        {"at": 1, "kind": "count", "path": "walls", "value": 0},
        {"at": 9, "kind": "exists", "path": "rooms"},
    ]
    err = invalid(scenario)
    text = "\n".join(err.issues)
    assert "assertions[1].at=9" in text
    assert "no checkpoint after that step" in text


def test_assertion_capture_kind_must_be_captured() -> None:
    scenario = base_scenario()
    scenario["assertions"] = [
        {"at": 1, "artifact": "plan", "kind": "exists", "path": "x"}
    ]
    err = invalid(scenario)
    assert "only capture ['state']" in str(err)


def test_count_assertion_requires_integer_value() -> None:
    scenario = base_scenario()
    scenario["assertions"] = [{"at": 1, "kind": "count", "path": "walls", "value": "four"}]
    err = invalid(scenario)
    assert "requires integer value" in str(err)


def test_invalid_yaml_reports_parse_error(tmp_path: Path) -> None:
    bad = tmp_path / "bad.yaml"
    bad.write_text("name: [unclosed\nsteps:", encoding="utf-8")
    with pytest.raises(ScenarioLoadError) as excinfo:
        load_scenario(bad)
    assert "invalid YAML" in str(excinfo.value)


def test_non_mapping_document_rejected(tmp_path: Path) -> None:
    bad = tmp_path / "list.yaml"
    bad.write_text("- just\n- a\n- list\n", encoding="utf-8")
    with pytest.raises(ScenarioLoadError) as excinfo:
        load_scenario(bad)
    assert "top-level document must be a mapping" in str(excinfo.value)


def test_extra_top_level_key_forbidden() -> None:
    scenario = base_scenario()
    scenario["stepz"] = []
    err = invalid(scenario)
    assert "stepz" in str(err)


def test_full_round_trip() -> None:
    scenario: Scenario = load_scenario(EXAMPLE)
    dumped = scenario.model_dump(exclude_defaults=False)
    reparsed = parse_scenario(dumped)
    assert reparsed == scenario
