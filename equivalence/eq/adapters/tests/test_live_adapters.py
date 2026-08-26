"""Fake-transport tests for the live adapters (C6): Sh3dAdapter against an
in-process FramedServer stand-in, HomelyAdapter against a fake homely WS
client. No real SH3D or tauri app is involved."""

from __future__ import annotations

import asyncio
import contextlib
import json

import pytest
from websockets.asyncio.client import connect

from eq.adapters.base import AdapterError
from eq.adapters.homely import HomelyAdapter
from eq.adapters.server import AutomationServer
from eq.adapters.sh3d import Sh3dAdapter


def run(coro):
    return asyncio.run(coro)


class FakeFramedServer:
    """In-process stand-in for driver-java FramedServer: hello line on accept,
    then one newline-delimited JSON response per request line."""

    def __init__(self, handler=None):
        self.handler = handler or self._echo
        self.silent = False
        self.server = None
        self.port: int | None = None
        self._writers: list[asyncio.StreamWriter] = []

    @staticmethod
    def _echo(msg: dict) -> dict:
        return {"id": msg["id"], "ok": True, "data": {"echo": msg["type"], "params": msg.get("params", {})}}

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
                if self.silent:
                    continue
                msg = json.loads(line.decode())
                writer.write(json.dumps(self.handler(msg)).encode() + b"\n")
                await writer.drain()
        except (ConnectionResetError, BrokenPipeError):
            pass
        finally:
            self._writers.remove(writer)
            writer.close()
            with contextlib.suppress(Exception):
                await writer.wait_closed()


# ---- Sh3dAdapter ----


def test_sh3d_adapter_reads_hello_and_round_trips():
    async def flow():
        fake = FakeFramedServer()
        await fake.start()
        adapter = Sh3dAdapter("sh3d", port=fake.port)
        try:
            await adapter.start()
            assert adapter.app == "sh3d-driver"
            assert adapter.version == "7.5"
            assert adapter.mode == "driver"
            data = await adapter.request("ping")
            assert data == {"echo": "ping", "params": {}}
        finally:
            await adapter.stop()
            await fake.stop()

    run(flow())


def test_sh3d_adapter_correlates_concurrent_requests_by_id():
    async def flow():
        fake = FakeFramedServer()
        await fake.start()
        adapter = Sh3dAdapter("sh3d", port=fake.port)
        try:
            await adapter.start()
            first, second = await asyncio.gather(
                adapter.request("ping"),
                adapter.request("get_state"),
            )
            assert first["echo"] == "ping"
            assert second["echo"] == "get_state"
        finally:
            await adapter.stop()
            await fake.stop()

    run(flow())


def test_sh3d_adapter_error_response_raises_adapter_error():
    async def flow():
        def fail(msg):
            return {"id": msg["id"], "ok": False, "error": "no wall under point", "code": "NO_TARGET"}

        fake = FakeFramedServer(handler=fail)
        await fake.start()
        adapter = Sh3dAdapter("sh3d", port=fake.port)
        try:
            await adapter.start()
            with pytest.raises(AdapterError) as excinfo:
                await adapter.request("click", {"x": 1, "y": 2})
            assert excinfo.value.code == "NO_TARGET"
            assert excinfo.value.error == "no wall under point"
        finally:
            await adapter.stop()
            await fake.stop()

    run(flow())


def test_sh3d_adapter_requires_start_and_fails_pending_on_disconnect():
    async def flow():
        unstarted = Sh3dAdapter("sh3d", port=1)
        with pytest.raises(AdapterError) as not_started:
            await unstarted.request("ping")
        assert not_started.value.code == "NOT_STARTED"

        fake = FakeFramedServer()
        fake.silent = True  # never answers -> request stays pending
        await fake.start()
        adapter = Sh3dAdapter("sh3d", port=fake.port)
        await adapter.start()
        pending = asyncio.create_task(adapter.request("ping"))
        await asyncio.sleep(0.05)
        await fake.stop()  # drop the connection under the pending request
        with pytest.raises(AdapterError) as excinfo:
            await pending
        assert excinfo.value.code == "DISCONNECTED"
        await adapter.stop()

    run(flow())


# ---- HomelyAdapter ----


class FakeHomelyClient:
    """Fake homely app: hellos `app:"homely"` over WS and echoes every
    request back as `{ok:true,data:{echo:<type>}}`; `fail_with` turns the
    next reply into an error response."""

    def __init__(self, server: AutomationServer):
        self.server = server
        self.received: list[str] = []
        self.fail_with: tuple[str, str] | None = None
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
                if self.fail_with is not None:
                    error, code = self.fail_with
                    reply = {"id": req["id"], "ok": False, "error": error, "code": code}
                else:
                    reply = {"id": req["id"], "ok": True, "data": {"echo": req["type"]}}
                await ws.send(json.dumps(reply))


def test_homely_adapter_adopts_hello_session_and_round_trips():
    async def flow():
        server = AutomationServer()
        await server.start()
        client = FakeHomelyClient(server)
        adapter = HomelyAdapter("tauri", server)
        try:
            await client.start()
            await adapter.start()
            assert await adapter.request("ping") == {"echo": "ping"}
            assert await adapter.get_state() == {"echo": "get_state"}
            return client.received
        finally:
            await adapter.stop()
            await client.stop()
            await server.stop()

    assert run(flow()) == ["ping", "get_state"]


def test_homely_adapter_error_response_raises_adapter_error():
    async def flow():
        server = AutomationServer()
        await server.start()
        client = FakeHomelyClient(server)
        client.fail_with = ("boom", "NOPE")
        adapter = HomelyAdapter("tauri", server)
        try:
            await client.start()
            await adapter.start()
            with pytest.raises(AdapterError) as excinfo:
                await adapter.request("get_state")
            assert excinfo.value.code == "NOPE"
            assert excinfo.value.error == "boom"
        finally:
            await adapter.stop()
            await client.stop()
            await server.stop()

    run(flow())


def test_homely_adapter_times_out_without_hello():
    async def flow():
        server = AutomationServer()
        await server.start()
        try:
            adapter = HomelyAdapter("tauri", server, timeout=0.05)
            with pytest.raises(TimeoutError):
                await adapter.start()
        finally:
            await server.stop()

    run(flow())


def test_homely_adapter_request_before_start_raises():
    async def flow():
        server = AutomationServer()
        await server.start()
        try:
            adapter = HomelyAdapter("tauri", server)
            with pytest.raises(AdapterError) as excinfo:
                await adapter.request("ping")
            assert excinfo.value.code == "NOT_STARTED"
        finally:
            await server.stop()

    run(flow())
