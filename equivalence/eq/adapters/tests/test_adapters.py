"""Tests for eq.adapters: mock protocol implementation, automation server,
and the lockstep orchestrator (C2)."""

from __future__ import annotations

import asyncio
import base64
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from eq.adapters.base import Adapter, AdapterError
from eq.adapters.mock import CAMERA_OBSERVER, CAMERA_TOP, MockAdapter
from eq.adapters.orchestrator import Orchestrator, build_mock_adapters
from eq.adapters.server import AutomationServer
from eq.dsl.loader import load_scenario

REPO_ROOT = Path(__file__).resolve().parents[4]
SCHEMA_PATH = REPO_ROOT / "docs" / "schema" / "home-project.schema.json"
CREATE_ROOM = REPO_ROOT / "equivalence" / "scenarios" / "walls" / "create_room.yaml"


def run(coro):
    return asyncio.run(coro)


@pytest.fixture(scope="module")
def validator() -> Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text())
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


# ---- MockAdapter ----


def test_mock_empty_state_validates_against_frozen_schema(validator):
    errors = list(validator.iter_errors(run(MockAdapter("m").get_state())))
    assert errors == []


def test_mock_create_room_scenario_end_to_end(validator):
    scenario = load_scenario(CREATE_ROOM)
    adapter = MockAdapter("m")
    for step in [*scenario.setup, *scenario.steps]:
        run(adapter.request(step.command, step.params))
    state = run(adapter.get_state())
    assert not list(validator.iter_errors(state))
    assert len(state["walls"]) == 4
    assert len(state["rooms"]) == 1
    assert [w["xStart"] for w in state["walls"]] == [100, 600, 600, 100]
    assert [w["yStart"] for w in state["walls"]] == [100, 100, 400, 400]
    assert state["rooms"][0]["points"] == [[100, 100], [600, 100], [600, 400], [100, 400]]


def test_mock_undo_redo_round_trip():
    adapter = MockAdapter("m")

    async def flow():
        await adapter.request("select_tool", {"tool": "wall"})
        await adapter.request("click", {"x": 0, "y": 0})
        await adapter.request("click", {"x": 100, "y": 0})
        caps = await adapter.request("undo")
        assert caps == {"canUndo": False, "canRedo": True}
        assert (await adapter.get_state())["walls"] == []
        caps = await adapter.request("redo")
        assert caps == {"canUndo": True, "canRedo": False}
        assert len((await adapter.get_state())["walls"]) == 1

    run(flow())


def test_mock_escape_cancels_pending_wall_chain():
    adapter = MockAdapter("m")

    async def flow():
        await adapter.request("select_tool", {"tool": "wall"})
        await adapter.request("click", {"x": 10, "y": 10})
        await adapter.request("key", {"key": "escape"})
        await adapter.request("click", {"x": 50, "y": 50})
        return await adapter.get_state()

    assert run(flow())["walls"] == []


def test_mock_magnetism_snaps_onto_chain_start_and_closes_loop():
    adapter = MockAdapter("m")

    async def flow():
        await adapter.request("select_tool", {"tool": "wall"})
        await adapter.request("set_magnetism", {"enabled": False})
        await adapter.request("click", {"x": 0, "y": 0})
        await adapter.request("click", {"x": 200, "y": 0})
        await adapter.request("click", {"x": 200, "y": 200})
        await adapter.request("set_magnetism", {"enabled": True})
        await adapter.request("click", {"x": 1.5, "y": -2})
        return await adapter.get_state()

    state = run(flow())
    assert len(state["walls"]) == 3
    assert len(state["rooms"]) == 1
    closing = state["walls"][2]
    assert (closing["xStart"], closing["yStart"]) == (200, 200)
    assert (closing["xEnd"], closing["yEnd"]) == (0, 0)


def test_mock_magnetism_disabled_keeps_raw_coordinates():
    adapter = MockAdapter("m")

    async def flow():
        await adapter.request("select_tool", {"tool": "wall"})
        await adapter.request("set_magnetism", {"enabled": False})
        await adapter.request("click", {"x": 0, "y": 0})
        await adapter.request("click", {"x": 200, "y": 0})
        await adapter.request("click", {"x": 200, "y": 200})
        await adapter.request("click", {"x": 1.5, "y": -2})
        return await adapter.get_state()

    state = run(flow())
    assert len(state["walls"]) == 3
    assert len(state["rooms"]) == 0
    last = state["walls"][2]
    assert (last["xStart"], last["yStart"]) == (200, 200)
    assert (last["xEnd"], last["yEnd"]) == (1.5, -2)


def test_mock_furniture_add_select_modify_delete():
    adapter = MockAdapter("m")

    async def flow():
        added = await adapter.request("add_furniture", {"catalogId": "chair", "x": 150, "y": 150})
        oid = added["objectId"]
        await adapter.request("select_object", {"objectId": oid})
        await adapter.request("modify_selected", {"props": {"x": 300, "angleDeg": 45}})
        state = await adapter.get_state()
        furn = state["furniture"][0]
        assert (furn["x"], furn["angleDeg"]) == (300, 45)
        with pytest.raises(AdapterError) as excinfo:
            await adapter.request("select_object", {"objectId": "nope-99"})
        assert excinfo.value.code == "NO_TARGET"
        await adapter.request("delete_selection")
        state = await adapter.get_state()
        assert state["furniture"] == []
        assert state["selection"] == []

    run(flow())


def test_mock_copy_paste_creates_offset_clone_and_updates_selection():
    adapter = MockAdapter("m")

    async def flow():
        added = await adapter.request("add_furniture", {"catalogId": "table", "x": 100, "y": 100})
        await adapter.request("select_object", {"objectId": added["objectId"]})
        await adapter.request("copy")
        await adapter.request("paste")
        state = await adapter.get_state()
        ids = sorted(f["id"] for f in state["furniture"])
        assert len(ids) == 2 and ids[0] != ids[1]
        pasted = next(f for f in state["furniture"] if f["id"] != added["objectId"])
        assert (pasted["x"], pasted["y"]) == (120, 120)
        assert state["selection"] == [pasted["id"]]

    run(flow())


def test_mock_screenshot_is_deterministic_png():
    adapter = MockAdapter("m")

    async def shot():
        return await adapter.screenshot_bytes(view="plan", width=320, height=240)

    async def both():
        return await asyncio.gather(shot(), shot())

    first, second = run(both())
    assert first == second
    assert first[:8] == b"\x89PNG\r\n\x1a\n"

    data = run(adapter.request("screenshot", {"view": "3d", "width": 64, "height": 48}))
    assert (data["width"], data["height"]) == (64, 48)
    assert base64.b64decode(data["pngBase64"])[:8] == b"\x89PNG\r\n\x1a\n"


def test_mock_get_state_rounds_floats_to_3_decimals():
    adapter = MockAdapter("m")

    async def flow():
        await adapter.request("select_tool", {"tool": "wall"})
        await adapter.request("click", {"x": 10, "y": 10})
        await adapter.request("click", {"x": 33.3333333, "y": 0.12349})
        return await adapter.get_state()

    wall = run(flow())["walls"][0]
    assert wall["xEnd"] == 33.333
    assert wall["yEnd"] == 0.123


def test_mock_unknown_command_raises():
    with pytest.raises(AdapterError) as excinfo:
        run(MockAdapter("m").request("teleport"))
    assert excinfo.value.code == "UNKNOWN_COMMAND"


def test_mock_camera_presets_match_reference_defaults():
    adapter = MockAdapter("m")

    async def flow():
        top = await adapter.request("camera_preset", {"preset": "top"})
        observer = await adapter.request("camera_preset", {"preset": "observer"})
        return top["camera"], observer["camera"]

    top, observer = run(flow())
    assert top == CAMERA_TOP and observer == CAMERA_OBSERVER


# ---- AutomationServer ----


def test_server_websocket_handshake_and_request_correlation():
    async def flow():
        server = AutomationServer()
        await server.start()
        try:
            from websockets.asyncio.client import connect

            received: list[dict] = []

            async def client():
                async with connect(f"ws://127.0.0.1:{server.ws_port}") as ws:
                    await ws.send(json.dumps({"type": "hello", "app": "homely-test", "version": "0.1", "mode": "tauri"}))
                    req = json.loads(await ws.recv())
                    received.append(req)
                    await ws.send(json.dumps({"id": req["id"], "ok": True, "data": {"pong": True}}))
                    req2 = json.loads(await ws.recv())
                    received.append(req2)
                    await ws.send(json.dumps({"id": req2["id"], "ok": False, "error": "boom", "code": "NOPE"}))

            task = asyncio.create_task(client())
            session = await server.wait_for_session("homely-test", timeout=5)
            assert session.mode == "tauri"
            pong = await session.request("ping")
            assert pong == {"pong": True}
            with pytest.raises(AdapterError) as excinfo:
                await session.request("get_state")
            assert excinfo.value.code == "NOPE"
            await task
            assert [r["type"] for r in received] == ["ping", "get_state"]
        finally:
            await server.stop()

    run(flow())


def test_server_tcp_newline_delimited_framing():
    async def flow():
        server = AutomationServer()
        await server.start()
        try:

            async def client():
                reader, writer = await asyncio.open_connection(server.host, server.tcp_port)
                writer.write(b'{"type":"hello","app":"sh3d-test","version":"7.5","mode":"driver"}\n')
                await writer.drain()
                line = await reader.readline()
                req = json.loads(line.decode())
                writer.write(
                    json.dumps({"id": req["id"], "ok": True, "data": {"commands": ["ping"]}}).encode() + b"\n"
                )
                await writer.drain()
                writer.close()

            task = asyncio.create_task(client())
            session = await server.wait_for_session("sh3d-test", timeout=5)
            data = await session.request("get_capabilities")
            assert data == {"commands": ["ping"]}
            await task
        finally:
            await server.stop()

    run(flow())


def test_server_wait_for_session_times_out_without_hello():
    async def flow():
        server = AutomationServer()
        await server.start()
        try:
            with pytest.raises(TimeoutError):
                await server.wait_for_session("ghost", timeout=0.05)
        finally:
            await server.stop()

    run(flow())


# ---- Orchestrator ----


def test_build_mock_adapters_covers_sh3d_plus_target_modes():
    scenario = load_scenario(CREATE_ROOM)
    adapters = build_mock_adapters(scenario)
    assert set(adapters) == {"sh3d", *scenario.target.mode}
    assert all(isinstance(a, MockAdapter) for a in adapters.values())


def test_orchestrator_rejects_empty_adapter_set(tmp_path):
    scenario = load_scenario(CREATE_ROOM)
    with pytest.raises(ValueError):
        Orchestrator(scenario, {})


def test_orchestrator_demo_run_produces_artifacts(tmp_path):
    scenario = load_scenario(CREATE_ROOM)
    adapters = build_mock_adapters(scenario)
    result = run(Orchestrator(scenario, adapters, results_root=tmp_path).run())

    assert result.ok, result.errors
    run_dir: Path = result.artifacts_dir
    assert (run_dir / "manifest.json").is_file()
    manifest = json.loads((run_dir / "manifest.json").read_text())
    assert manifest["scenarioName"] == "create-room-example" or manifest["scenarioName"]
    assert sorted(manifest["adapters"]) == sorted(adapters)

    actions = json.loads((run_dir / "actions.json").read_text())
    setup_entries = [a for a in actions if a["phase"] == "setup"]
    step_entries = [a for a in actions if a["phase"] == "steps"]
    assert len(setup_entries) == len(scenario.setup)
    assert len(step_entries) == len(scenario.steps)
    last = step_entries[-1]
    assert last["step"] == len(scenario.steps)
    for response in last["responses"].values():
        assert response["ok"] is True

    ledger = json.loads((run_dir / "ledger.json").read_text())
    assert {e["adapter"] for e in ledger} == set(adapters)
    for entry in ledger:
        assert entry["step"] == 7
        assert len(entry["created"]["walls"]) == 4
        assert len(entry["created"]["rooms"]) == 1
        assert entry["removed"] == {c: [] for c in ("walls", "rooms", "furniture", "dimensionLines", "labels")}

    states = json.loads((run_dir / "states" / "tauri" / "step-7.json").read_text())
    sh3d_states = json.loads((run_dir / "states" / "sh3d" / "step-7.json").read_text())
    assert len(states["walls"]) == 4 and len(sh3d_states["walls"]) == 4

    png = (run_dir / "screenshots" / "tauri" / "step-7-plan.png")
    assert not png.exists()  # checkpoint captures only [state]

    errors = json.loads((run_dir / "errors.json").read_text())
    assert errors == []


def test_orchestrator_captures_screenshots_when_requested(tmp_path):
    scenario = load_scenario(CREATE_ROOM)
    scenario.checkpoints[0].capture = ["state", "plan", "3d"]
    adapters = build_mock_adapters(scenario)
    result = run(Orchestrator(scenario, adapters, results_root=tmp_path).run())
    assert result.ok, result.errors
    for name in adapters:
        for view in ("plan", "3d"):
            path = result.artifacts_dir / "screenshots" / name / f"step-7-{view}.png"
            assert path.is_file()
            assert path.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"


def test_orchestrator_records_adapter_errors_and_continues(tmp_path):
    class FailingAdapter(Adapter):
        name = "broken"
        app = "mock"

        async def start(self):
            pass

        async def stop(self):
            pass

        async def request(self, command, params=None):
            raise AdapterError("no wall under point", "NO_TARGET")

    scenario = load_scenario(CREATE_ROOM)
    adapters = {"good": MockAdapter("good"), "broken": FailingAdapter()}
    result = run(Orchestrator(scenario, adapters, results_root=tmp_path).run())

    assert not result.ok
    assert all(e["code"] == "NO_TARGET" for e in result.errors)
    actions = json.loads((result.artifacts_dir / "actions.json").read_text())
    broken_responses = [a["responses"]["broken"] for a in actions if a["phase"] == "steps"]
    assert all(r["ok"] is False and r["code"] == "NO_TARGET" for r in broken_responses)
    good_states = result.artifacts_dir / "states" / "good" / "step-7.json"
    assert good_states.is_file()


def test_two_fresh_mock_runs_are_identical_byte_wise(tmp_path):
    """Determinism smoke: same scenario twice -> identical artifacts modulo wall-clock timings."""

    def execute(root: Path) -> dict:
        scenario = load_scenario(CREATE_ROOM)
        adapters = build_mock_adapters(scenario)
        result = run(Orchestrator(scenario, adapters, results_root=root).run())
        assert result.ok
        run_dir: Path = result.artifacts_dir
        actions = json.loads((run_dir / "actions.json").read_text())
        for entry in actions:
            entry.pop("elapsedMs", None)
        return {
            "actions": json.dumps(actions, sort_keys=True),
            "ledger": (run_dir / "ledger.json").read_text(),
            "errors": (run_dir / "errors.json").read_text(),
            "state": (run_dir / "states" / "sh3d" / "step-7.json").read_text(),
        }

    first = execute(tmp_path / "a")
    second = execute(tmp_path / "b")
    for key in ("actions", "ledger", "errors", "state"):
        assert first[key] == second[key], key
