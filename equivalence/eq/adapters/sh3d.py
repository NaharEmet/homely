"""Sh3dAdapter: TCP client connecting OUT to the Java driver's FramedServer
(equivalence/driver-java/, `./run.sh <port>`). The server binds loopback,
sends its hello line immediately on accept, then answers exactly one
newline-delimited JSON response per request line (ws-protocol.md v1).

Response correlation and ok/error mapping are delegated to the shared
`Session`, so this adapter behaves identically to an AutomationServer-backed
one: `request()` returns response `data` or raises `AdapterError`.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
from typing import Any

from eq.adapters.base import Adapter, AdapterError
from eq.adapters.server import Session

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 9440


class Sh3dAdapter(Adapter):
    app = "sh3d-driver"

    def __init__(self, name: str = "sh3d", host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
        self.name = name
        self.host = host
        self.port = port
        self.version: str | None = None
        self.mode: str | None = None
        self._session: Session | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._reader_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        reader, self._writer = await asyncio.open_connection(self.host, self.port)
        try:
            hello = json.loads((await reader.readline()).decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise AdapterError(f"driver sent malformed hello: {exc}", "PROTOCOL") from exc
        if hello.get("type") != "hello":
            raise AdapterError(f"expected hello handshake, got {hello}", "PROTOCOL")
        self.version = hello.get("version")
        self.mode = hello.get("mode")

        async def send_line(text: str) -> None:
            assert self._writer is not None
            self._writer.write(text.encode("utf-8") + b"\n")
            await self._writer.drain()

        self._session = Session(hello.get("app", self.app), self.version, self.mode, send_line)
        self._reader_task = asyncio.create_task(self._read_lines(self._session, reader))

    async def stop(self) -> None:
        if self._session is not None:
            self._session.fail_all("adapter stopped", "ADAPTER_STOPPED")
        if self._reader_task is not None:
            self._reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._reader_task
            self._reader_task = None
        if self._writer is not None:
            self._writer.close()
            with contextlib.suppress(Exception):
                await self._writer.wait_closed()
            self._writer = None
        self._session = None

    async def request(self, command: str, params: dict[str, Any] | None = None) -> Any:
        if self._session is None:
            raise AdapterError("adapter not started", "NOT_STARTED")
        return await self._session.request(command, params)

    @staticmethod
    async def _read_lines(session: Session, reader: asyncio.StreamReader) -> None:
        while True:
            line = await reader.readline()
            if not line:
                session.fail_all("driver disconnected", "DISCONNECTED")
                return
            session.handle_message(line.decode("utf-8").strip())
