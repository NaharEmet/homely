"""Live-mode suite runner tests (c7-runner-live): fake transports only — no
real SH3D or tauri process is spawned; a human runs that gate. The fakes
mirror the FakeFramedServer / fake homely WS client patterns from
eq/adapters/tests/test_live_adapters.py."""

from __future__ import annotations

import asyncio
import contextlib
import json
from pathlib import Path

import pytest
import yaml
from websockets.asyncio.client import connect

from eq.adapters.server import AutomationServer
from eq.reporting.cli import main
from eq.reporting.runner import _run_live_suite, run_suite

REPO_ROOT = Path(__file__).parents[4]
SCENARIOS = REPO_ROOT / "equivalence" / "scenarios"


class FakeFramedServer:
    """In-process stand-in for driver-java FramedServer (see
    eq/adapters/tests/test_live_adapters.py): hello line on accept, then one
    newline-delimited JSON echo response per request line."""

    def __init__(self):
        self.server = None
        self.port: int | None = None
        self._writers: list[asyncio.StreamWriter] = []

    async def start(self) -> None:
        self.server = await asyncio.start_server(self._serve, "127.0.0.1", 0)
        self.port = self.server.sockets[0].getsockname()[1]

    async def stop(self) -> None:
        assert self.server is not None
        self.server.close()
        for writer in list(self._writers):  # py3.12 wait_closed blocks on live conns
            writer.close()
        await self.server.wait_closed()

    async def _serve(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        self._writers.append(writer)
        writer.write(b'{"type":"hello","app":"sh3d-driver","version":"7.5","mode":"driver"}\n')
        await writer.drain()
        try:
            while True:
                line = await reader.readline()
                if not line:
                    break
                msg = json.loads(line.decode())
                writer.write(
                    json.dumps(
                        {"id": msg["id"], "ok": True, "data": {"echo": msg["type"], "params": msg.get("params", {})}}
                    ).encode()
                    + b"\n"
                )
                await writer.drain()
        except (ConnectionResetError, BrokenPipeError):
            pass
        finally:
            self._writers.remove(writer)
            writer.close()
            with contextlib.suppress(Exception):
                await writer.wait_closed()


class FakeHomelyClient:
    """Fake homely app hellos `app:"homely"` over WS and echoes every request
    back WITH params so its payloads match FakeFramedServer's echo."""

    def __init__(self, server: AutomationServer):
        self.server = server
        self.received: list[str] = []
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._serve())

    async def stop(self) -> None:
        assert self._task is not None
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task

    async def _serve(self) -> None:
        assert self.server.ws_port is not None
        async with connect(f"ws://127.0.0.1:{self.server.ws_port}") as ws:
            await ws.send(json.dumps({"type": "hello", "app": "homely", "version": 1, "mode": "headless"}))
            while True:
                req = json.loads(await ws.recv())
                self.received.append(req["type"])
                reply = {
                    "id": req["id"],
                    "ok": True,
                    "data": {"echo": req["type"], "params": req.get("params", {})},
                }
                await ws.send(json.dumps(reply))


def _live_scenario(tmp_path: Path) -> Path:
    scenario = {
        "name": "live-fake-e2e",
        "description": "two steps + state checkpoint; both fakes echo identically",
        "target": {"os": ["linux"], "mode": ["tauri"]},
        "setup": [{"new_home": None}],
        "steps": [{"select_tool": {"tool": "wall"}}, {"click": {"x": 10, "y": 20}}],
        "checkpoints": [{"afterStep": 2, "capture": ["state"]}],
        "assertions": [],
    }
    path = tmp_path / "live_fake_e2e.yaml"
    path.write_text(yaml.safe_dump(scenario), encoding="utf-8")
    return path


def _spy_server_stop(monkeypatch: pytest.MonkeyPatch) -> list[int]:
    stops: list[int] = []
    original = AutomationServer.stop

    def spying_stop(self):
        stops.append(1)
        return original(self)

    monkeypatch.setattr(AutomationServer, "stop", spying_stop)
    return stops


def test_live_suite_end_to_end_with_fakes(tmp_path, monkeypatch):
    """Session adoption + adapter map + orchestration + clean teardown."""
    stops = _spy_server_stop(monkeypatch)

    async def flow():
        fake_driver = FakeFramedServer()
        await fake_driver.start()
        server = AutomationServer()
        await server.start()
        homely = FakeHomelyClient(server)
        await homely.start()
        monkeypatch.setenv("EQ_SH3D_PORT", str(fake_driver.port))
        try:
            outcomes = await _run_live_suite([_live_scenario(tmp_path)], tmp_path, server=server)
            return outcomes, server, fake_driver, homely.received
        finally:
            await homely.stop()
            await fake_driver.stop()

    outcomes, server, fake_driver, received = asyncio.run(flow())

    assert len(outcomes) == 1
    outcome = outcomes[0]
    assert outcome.ok and outcome.skipped is None
    assert outcome.state_failures == 0 and outcome.assertion_failures == 0
    scenario_dir = tmp_path / outcome.artifacts_dir
    manifest = json.loads((scenario_dir / "manifest.json").read_text())
    assert manifest["adapters"] == ["sh3d", "tauri"]
    assert sorted(p.name for p in (scenario_dir / "states").iterdir()) == ["sh3d", "tauri"]
    # baseline get_state, setup new_home, steps, checkpoint get_state
    assert received == ["get_state", "new_home", "select_tool", "click", "get_state"]
    # teardown: session adopted then released, driver connection closed
    assert server.sessions == {}
    assert fake_driver._writers == []
    assert stops == [1]


def test_live_suite_teardown_when_session_never_arrives(tmp_path, monkeypatch):
    """Homely never connects -> TimeoutError, everything still stopped."""
    stops = _spy_server_stop(monkeypatch)

    async def flow():
        fake_driver = FakeFramedServer()
        await fake_driver.start()
        monkeypatch.setenv("EQ_SH3D_PORT", str(fake_driver.port))
        try:
            with pytest.raises(TimeoutError):
                await _run_live_suite([_live_scenario(tmp_path)], tmp_path, session_timeout=0.05)
        finally:
            await fake_driver.stop()
        return fake_driver

    fake_driver = asyncio.run(flow())

    assert stops == [1]
    assert fake_driver._writers == []  # sh3d adapter stopped despite the failure


def test_live_suite_skips_platform_mismatch(tmp_path, monkeypatch):
    stops = _spy_server_stop(monkeypatch)

    async def flow():
        fake_driver = FakeFramedServer()
        await fake_driver.start()
        server = AutomationServer()
        await server.start()
        homely = FakeHomelyClient(server)
        await homely.start()
        monkeypatch.setenv("EQ_SH3D_PORT", "0")  # never used: scenario is skipped
        try:
            return await _run_live_suite(
                [SCENARIOS / "walls" / "create_room.yaml"],
                tmp_path,
                os_filter={"macos"},
                server=server,
            )
        finally:
            await homely.stop()
            await fake_driver.stop()

    outcomes = asyncio.run(flow())

    assert len(outcomes) == 1
    assert outcomes[0].skipped and "target mismatch" in outcomes[0].skipped
    assert stops == [1]  # server still torn down on a skip-only suite


def test_run_suite_rejects_unknown_target(tmp_path):
    with pytest.raises(ValueError, match="unknown target"):
        run_suite(SCENARIOS / "walls" / "create_room.yaml", tmp_path, target="bogus")


def test_cli_live_flag_selects_live_target(monkeypatch):
    captured: dict = {}

    def fake_run_suite(paths, results_root, **kwargs):
        captured.update(kwargs)
        return {
            "ok": True,
            "runId": "x",
            "totals": {"scenarios": 1, "passed": 1, "failed": 0, "skipped": 0},
        }

    monkeypatch.setattr("eq.reporting.cli.run_suite", fake_run_suite)
    assert main(["whatever.yaml", "--live"]) == 0
    assert captured["target"] == "live"
    assert main(["whatever.yaml"]) == 0
    assert captured["target"] == "mock"


def test_mock_suite_aggregate_records_target(tmp_path):
    aggregate = run_suite(SCENARIOS / "walls" / "create_room.yaml", tmp_path)
    assert aggregate["target"] == "mock"
