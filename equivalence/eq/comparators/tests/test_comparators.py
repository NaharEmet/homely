"""Tests for eq.comparators: diff, matching, metrics, assertions, run."""

from __future__ import annotations

import asyncio
import io
import json
import shutil
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageDraw

from eq.adapters import Orchestrator, build_mock_adapters
from eq.comparators import (
    IdMap,
    VisualResult,
    build_id_map,
    compare_artifacts,
    compare_images,
    compare_states,
    deep_diff,
    evaluate_assertion,
    evaluate_assertions,
    geometry_summary,
    metric_deltas,
    polygon_area,
    polygon_perimeter,
    resolve_path,
    wall_length,
    write_comparison,
)
from eq.dsl import load_scenario

REPO_ROOT = Path(__file__).parents[4]
SCENARIOS = REPO_ROOT / "equivalence" / "scenarios"


def _state(wall_ids=("w1", "w2"), level_ids=("l1",), selection=()):
    return {
        "schemaVersion": 1,
        "levels": [{"id": lid, "name": "Niveau 0"} for lid in level_ids],
        "walls": [
            {
                "id": wid,
                "xStart": 100.0 + 400.0 * i,
                "yStart": 100.0,
                "xEnd": 100.0 + 400.0 * (i + 1),
                "yEnd": 100.0,
                "thickness": 10.0,
            }
            for i, wid in enumerate(wall_ids)
        ],
        "rooms": [],
        "furniture": [],
        "dimensionLines": [],
        "labels": [],
        "selection": list(selection),
        "capabilities": {},
    }


# ---------------------------------------------------------------- deep diff


def test_deep_diff_equal_documents_yields_nothing():
    doc = {"a": {"b": [1, 2, 3]}, "c": "x", "d": None}
    assert deep_diff(doc, json.loads(json.dumps(doc))) == []


def test_positional_tolerance_edge_passes_and_beyond_fails():
    assert deep_diff({"v": 100.0}, {"v": 100.01}) == []
    failures = deep_diff({"v": 100.0}, {"v": 100.02})
    assert len(failures) == 1
    failure = failures[0]
    assert failure.kind == "mismatch"
    assert failure.path == "v"
    assert failure.expected == 100.0
    assert failure.actual == 100.02
    assert failure.delta == pytest.approx(0.02)


def test_angle_tolerance_applies_to_deg_fields():
    assert deep_diff({"angleDeg": 45.0}, {"angleDeg": 45.05}) == []
    assert deep_diff({"angleDeg": 45.0}, {"angleDeg": 45.06}) != []


def test_color_fields_compare_exactly():
    assert deep_diff({"color": 16711680}, {"color": 16711681}) != []
    assert deep_diff({"color": None}, {"color": None}) == []


def test_missing_extra_and_type_failures():
    failures = deep_diff({"a": {"b": 1}}, {})
    assert [f.kind for f in failures] == ["missing"]
    assert failures[0].path == "a"
    assert failures[0].expected == {"b": 1}
    assert deep_diff({}, {"z": 9})[0].kind == "extra"
    type_failures = deep_diff({"flag": True}, {"flag": 1})
    assert type_failures[0].kind == "type"
    assert type_failures[0].path == "flag"


def test_list_count_mismatch_and_pairing():
    failures = deep_diff({"walls": [1, 2]}, {"walls": [1]})
    kinds = {f.kind for f in failures}
    assert "count" in kinds
    assert any(f.expected == 2 and f.actual == 1 for f in failures)


# ------------------------------------------------------- null vs absent keys


def test_null_value_equals_absent_key_both_directions():
    # driver golden serializes "no value" as explicit null; homely omits the key
    assert deep_diff({"name": None}, {}) == []
    assert deep_diff({}, {"name": None}) == []


def test_null_equals_absent_nested_in_dicts():
    expected = {"cameras": {"observer": {"fixedSize": None}, "top": {"id": "camera-top-1"}}}
    # fixedSize: driver null vs homely omitted key -> match
    assert deep_diff(expected, {"cameras": {"observer": {}, "top": {"id": "camera-top-1"}}}) == []
    # id: real value vs absent or null -> fail
    assert deep_diff(expected, {"cameras": {"observer": {}, "top": {}}}) != []
    assert deep_diff(expected, {"cameras": {"observer": {}, "top": {"id": None}}}) != []


def test_null_equals_absent_in_list_items_walls_cameras():
    expected = {
        "walls": [
            {
                "id": "w1",
                "xStart": 0.0,
                "arcExtent": None,
                "heightAtEnd": None,
                "levelRef": None,
                "leftSideColor": None,
                "rightSideColor": None,
            }
        ],
        "cameras": [{"id": None}],
    }
    actual = {"walls": [{"id": "w1", "xStart": 0.0}], "cameras": [{}]}
    assert deep_diff(expected, actual) == []
    assert deep_diff(actual, expected) == []


def test_compare_states_treats_top_level_absent_as_null():
    expected = _state()
    expected["name"] = None
    assert compare_states(expected, _state()) == []


def test_real_null_vs_value_still_fails_both_directions():
    failures = deep_diff({"walls": [{"arcExtent": None}]}, {"walls": [{"arcExtent": 0.5}]})
    assert len(failures) == 1
    assert failures[0].kind == "type"
    assert failures[0].path == "walls[0].arcExtent"
    assert deep_diff({"walls": [{"arcExtent": 0.5}]}, {"walls": [{"arcExtent": None}]}) != []


def test_absent_key_vs_real_value_still_fails():
    failures = deep_diff({"heightAtEnd": None}, {})
    assert failures == []
    missing = deep_diff({"heightAtEnd": 250.0}, {})
    assert missing[0].kind == "missing"
    extra = deep_diff({}, {"patternId": "hatchUp"})
    assert extra[0].kind == "extra"
    state_failures = compare_states({"name": "Home"}, _state())
    assert any(f.kind == "missing" and f.path == "name" for f in state_failures)
    # actual-only null key is ignored, mirroring the live run's home-name case
    assert compare_states(_state(), {**_state(), "name": None}) == []
    state_missing = compare_states(_state(), {"name": None})
    assert any(f.kind == "missing" and f.path == "schemaVersion" for f in state_missing)


# ------------------------------------------------------------------ matching


def test_build_id_map_pairs_ledger_creation_ordinals():
    state_a = _state(wall_ids=("a1", "a2"))
    state_b = _state(wall_ids=("b1", "b2"))
    ledger = [
        {"adapter": "sh3d", "step": 1, "created": {"walls": ["a1"]}, "removed": {}},
        {"adapter": "sh3d", "step": 2, "created": {"walls": ["a2"]}, "removed": {}},
        {"adapter": "turi", "step": 1, "created": {"walls": ["b1"]}, "removed": {}},
        {"adapter": "turi", "step": 2, "created": {"walls": ["b2"]}, "removed": {}},
    ]
    id_map = build_id_map(state_a, state_b, ledger, adapter_a="sh3d", adapter_b="turi")
    assert id_map.objects["walls"] == {"a1": "b1", "a2": "b2"}
    assert id_map.mismatches == []
    assert compare_states(state_a, state_b, id_map) == []


def test_identical_ids_match_without_ledger():
    id_map = build_id_map(_state(), _state())
    assert id_map.objects["walls"] == {"w1": "w1", "w2": "w2"}


def test_count_difference_is_recorded_and_surfaces_in_diff():
    id_map = build_id_map(_state(), _state(wall_ids=("b1",)))
    mismatches = id_map.mismatches[0]
    assert mismatches["collection"] == "walls"
    assert mismatches["expected"] == 2 and mismatches["actual"] == 1
    failures = compare_states(_state(), _state(wall_ids=("b1",)), id_map)
    assert any(f.kind == "count" and f.path == "walls" for f in failures)


def test_rewrite_actual_remaps_selection_and_level_ref():
    state_a = _state(level_ids=("lvl-0",), selection=("w1",))
    state_b = _state(wall_ids=("bw1", "bw2"), level_ids=("blvl-0",), selection=("bw1",))
    state_b["walls"][0]["levelRef"] = "blvl-0"
    state_a["walls"][0]["levelRef"] = "lvl-0"
    ledger = [
        {"adapter": "sh3d", "step": 1, "created": {"walls": ["w1", "w2"], "levels": []}, "removed": {}},
        {"adapter": "turi", "step": 1, "created": {"walls": ["bw1", "bw2"], "levels": []}, "removed": {}},
        {"adapter": "sh3d", "step": 1, "created": {"levels": ["lvl-0"], "walls": []}, "removed": {}},
        {"adapter": "turi", "step": 1, "created": {"levels": ["blvl-0"], "walls": []}, "removed": {}},
    ]
    id_map = build_id_map(state_a, state_b, ledger, adapter_a="sh3d", adapter_b="turi")
    rewritten = id_map.rewrite_actual(state_b)
    assert rewritten["selection"] == ["w1"]
    assert rewritten["walls"][0]["levelRef"] == "lvl-0"
    assert rewritten["walls"][0]["id"] == "w1"
    assert rewritten["levels"][0]["id"] == "lvl-0"
    assert compare_states(state_a, rewritten) == []


# ------------------------------------------------------------------- metrics


def test_geometry_summary_known_values():
    state = {
        "walls": [
            {"xStart": 0.0, "yStart": 0.0, "xEnd": 300.0, "yEnd": 0.0},
            {"xStart": 300.0, "yStart": 0.0, "xEnd": 300.0, "yEnd": 400.0},
        ],
        "rooms": [
            {
                "points": [
                    {"x": 0, "y": 0},
                    {"x": 300, "y": 0},
                    {"x": 300, "y": 400},
                    {"x": 0, "y": 400},
                ]
            }
        ],
        "furniture": [{}],
        "dimensionLines": [],
        "labels": [],
    }
    summary = geometry_summary(state)
    assert summary["walls"]["totalLength"] == pytest.approx(700.0)
    assert summary["rooms"]["totalArea"] == pytest.approx(120000.0)
    assert summary["rooms"]["totalPerimeter"] == pytest.approx(1400.0)
    assert summary["furniture"]["count"] == 1


def test_polygon_helpers_edge_cases():
    assert polygon_area([(0, 0)]) == 0.0
    assert polygon_perimeter([(0, 0), (3, 4)]) == pytest.approx(10.0)
    assert wall_length({"xStart": 0, "yStart": 0, "xEnd": 3, "yEnd": 4}) == 5.0


def test_metric_deltas_flags_only_real_breaches():
    base = geometry_summary(_state())
    bigger = geometry_summary(
        _state(wall_ids=("w1", "w2", "w3"))
    )  # one extra wall -> count breach
    deltas = {(d.path, d.kind): d for d in metric_deltas(base, bigger)}
    assert ("metrics.walls.count", "mismatch") in deltas
    assert deltas[("metrics.walls.count", "mismatch")].delta == 1.0
    # tiny noise within tolerance passes
    noisy = json.loads(json.dumps(base))
    noisy["walls"]["totalLength"] += 0.01
    assert metric_deltas(base, noisy) == []


# ---------------------------------------------------------------- assertions


@pytest.fixture()
def artifacts(tmp_path):
    run = tmp_path / "run"
    (run / "states" / "sh3d").mkdir(parents=True)
    state = _state()
    state["walls"][0]["elevation"] = 2.5
    (run / "states" / "sh3d" / "step-3.json").write_text(json.dumps(state))
    shots = run / "screenshots" / "sh3d"
    shots.mkdir(parents=True)
    (shots / "step-3-plan.png").write_bytes(b"\x89PNG fake")
    return run


def test_resolve_path_dotted_and_bracket_forms():
    doc = {"walls": [{"thickness": 10.0}]}
    assert resolve_path(doc, "walls.0.thickness") == (True, 10.0)
    assert resolve_path(doc, "walls[0].thickness") == (True, 10.0)
    assert resolve_path(doc, "walls.5.x")[0] is False
    assert resolve_path(doc, "nope")[0] is False


def test_assertion_kinds_pass_and_fail(artifacts):
    def evaluate(kind, path, value=None, **kwargs):
        assertion = {"at": 3, "artifact": "state", "kind": kind, "path": path}
        if value is not None:
            assertion["value"] = value
        assertion.update(kwargs)
        return evaluate_assertion(assertion, artifacts, ["sh3d"])["perAdapter"][0]

    assert evaluate("count", "walls", 2)["status"] == "pass"
    failed_count = evaluate("count", "walls", 5)
    assert failed_count["status"] == "fail"
    assert failed_count["actual"] == 2
    assert evaluate("equals", "walls.0.id", "w1")["status"] == "pass"
    approx = evaluate("approx", "walls.0.elevation", 2.51)
    assert approx["status"] == "pass" and approx["delta"] == pytest.approx(0.01)
    assert evaluate("exists", "rooms")["status"] == "pass"
    assert evaluate("exists", "capabilities.camera")["status"] == "fail"
    assert evaluate("count", "missing.path", 1)["status"] == "error"
    missing_file = evaluate_assertion(
        {"at": 99, "artifact": "state", "kind": "exists", "path": "walls"},
        artifacts,
        ["sh3d"],
    )["perAdapter"][0]
    assert missing_file["status"] == "error"


def test_screenshot_artifacts_support_exists_only(artifacts):
    exists = evaluate_assertion(
        {"at": 3, "artifact": "plan", "kind": "exists", "path": "-"},
        artifacts,
        ["sh3d"],
    )["perAdapter"][0]
    assert exists["status"] == "pass"
    unsupported = evaluate_assertion(
        {"at": 3, "artifact": "plan", "kind": "count", "path": "-", "value": 1},
        artifacts,
        ["sh3d"],
    )["perAdapter"][0]
    assert unsupported["status"] == "unsupported"


def test_evaluate_assertions_summary_counts(artifacts):
    result = evaluate_assertions(
        [
            {"at": 3, "artifact": "state", "kind": "count", "path": "walls", "value": 2},
            {"at": 3, "artifact": "state", "kind": "count", "path": "walls", "value": 7},
        ],
        artifacts,
        ["sh3d"],
    )
    assert result["counts"] == {"total": 2, "failed": 1, "errors": 0}
    assert result["passed"] is False


# ---------------------------------------------------------------- e2e vs run


@pytest.fixture(scope="module")
def clean_run(tmp_path_factory):
    scenario = load_scenario(SCENARIOS / "walls" / "create_room.yaml")
    orchestrator = Orchestrator(
        scenario, build_mock_adapters(scenario), tmp_path_factory.mktemp("clean")
    )
    result = asyncio.run(orchestrator.run())
    return result.artifacts_dir


def test_identical_mock_run_comares_clean(clean_run):
    comparison = write_comparison(clean_run)
    assert comparison["schemaVersion"] == 1
    assert comparison["ok"] is True
    assert comparison["referenceAdapter"] == "sh3d"
    assert comparison["summary"]["stateFailures"] == 0
    assert comparison["summary"]["assertionFailures"] == 0
    assert comparison["summary"]["stepsCompared"] >= 1
    persisted = json.loads((Path(clean_run) / "comparison.json").read_text())
    assert persisted == comparison


def test_perturbed_state_produces_pinpointed_failure(clean_run, tmp_path):
    perturbed_dir = Path(shutil.copytree(clean_run, tmp_path / "perturbed"))
    target = perturbed_dir / "states" / "tauri" / "step-7.json"
    state = json.loads(target.read_text())
    reference_id = json.loads((perturbed_dir / "states" / "sh3d" / "step-7.json").read_text())[
        "walls"
    ][0]["id"]
    original_x = state["walls"][0]["xStart"]
    state["walls"][0]["xStart"] = original_x + 5.0
    target.write_text(json.dumps(state))

    comparison = compare_artifacts(perturbed_dir)
    assert comparison["ok"] is False
    step_entry = next(c for c in comparison["comparedSteps"] if c["step"] == 7)
    tauri_target = step_entry["targets"][0]
    assert tauri_target["target"] == "tauri"
    hit = [
        f
        for f in tauri_target["failures"]
        if f["path"] == "walls[0].xStart" and f["kind"] == "mismatch"
    ]
    assert hit, tauri_target["failures"]
    assert hit[0]["expected"] == pytest.approx(original_x)
    assert hit[0]["actual"] == pytest.approx(original_x + 5.0)
    assert hit[0]["delta"] == pytest.approx(5.0)
    assert hit[0]["objectId"] == reference_id
    assert any(d["path"] == "metrics.walls.totalLength" for d in tauri_target["metricDeltas"])
    assert comparison["summary"]["assertionFailures"] == 0


def test_comparison_deterministic_across_runs(tmp_path):
    scenario = load_scenario(SCENARIOS / "walls" / "create_room.yaml")
    results = []
    for index in range(2):
        orchestrator = Orchestrator(
            scenario, build_mock_adapters(scenario), tmp_path / f"run{index}"
        )
        result = asyncio.run(orchestrator.run())
        comparison = compare_artifacts(result.artifacts_dir)
        comparison.pop("runId")
        results.append(json.dumps(comparison, sort_keys=True))
    assert results[0] == results[1]


def test_idmap_inverse_helpers_and_lookup():
    id_map = IdMap(levels=[("la", "lb")], objects={"walls": {"wa": "wb"}})
    assert id_map.inverse_objects() == {"walls": {"wb": "wa"}}
    assert id_map.lookup_level_ref("lb") == "la"
    assert id_map.lookup_level_ref(None) is None
    assert id_map.lookup_level_ref("unknown") == "unknown"


# -------------------------------------------------------------------- visual


def _png(extra=None):
    """Known-different PNG pair: plain white vs white with a red 8x8 block."""
    image = Image.new("RGB", (32, 16), "white")
    if extra:
        ImageDraw.Draw(image).rectangle((4, 4, 11, 11), fill="red")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


KNOWN_SAME = (_png(), _png())
KNOWN_DIFFERENT = (_png(), _png(extra=True))


def test_visual_diff_identical_pair_matches():
    result = compare_images(*KNOWN_SAME)
    assert isinstance(result, VisualResult)
    assert result.matched is True
    assert result.score == 0.0
    assert result.differentPixels == 0
    assert result.totalPixels == 32 * 16
    assert result.maxDelta == 0
    assert result.to_dict()["matched"] is True


def test_visual_diff_known_different_pair_scores_and_heatmaps(tmp_path):
    diff_path = tmp_path / "diff.png"
    result = compare_images(*KNOWN_DIFFERENT, diff_path=diff_path)
    assert result.matched is False
    assert result.differentPixels == 64
    assert result.score == pytest.approx(64 / (32 * 16))
    assert result.maxDelta > 0
    heatmap = Image.open(diff_path).convert("RGB")
    assert heatmap.size == (32, 16)
    pixels = set(map(tuple, np.asarray(heatmap).reshape(-1, 3)))
    assert (255, 0, 0) in pixels
    assert (255, 255, 255) in pixels


def test_visual_diff_threshold_breach_flips_verdict():
    score = compare_images(*KNOWN_DIFFERENT).score
    assert compare_images(*KNOWN_DIFFERENT, threshold=score + 0.01).matched is True
    assert compare_images(*KNOWN_DIFFERENT, threshold=score - 0.01).matched is False


def test_visual_diff_pixel_tolerance_absorbs_small_deltas():
    base = _png()
    shifted = Image.new("RGB", (32, 16), (251, 251, 251))
    buffer = io.BytesIO()
    shifted.save(buffer, format="PNG")
    assert compare_images(base, buffer.getvalue(), pixel_tolerance=4).matched is True
    assert compare_images(base, buffer.getvalue()).matched is False


def test_visual_diff_size_mismatch_never_matches(tmp_path):
    tall = Image.new("RGB", (32, 32), "white")
    buffer = io.BytesIO()
    tall.save(buffer, format="PNG")
    result = compare_images(KNOWN_SAME[0], buffer.getvalue())
    assert result.matched is False
    assert result.sizeMismatch is True
    assert result.maxDelta is None
