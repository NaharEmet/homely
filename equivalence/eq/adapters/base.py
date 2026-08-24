"""Adapter abstraction over the automation surfaces (ws-protocol.md v1).

Every adapter — in-process MockAdapter, or a session to a real sh3d-driver /
homely process — exposes `request(command, params)` returning the response
`data` object, raising `AdapterError` when the adapter answers
`{"ok": false, "error": ..., "code": ...}`.
"""

from __future__ import annotations

import base64
from abc import ABC, abstractmethod
from typing import Any


class AdapterError(Exception):
    """An adapter answered ok=false (or a request failed transport-side)."""

    def __init__(self, error: str, code: str | None = None):
        super().__init__(f"{code}: {error}" if code else error)
        self.error = error
        self.code = code or "ADAPTER_ERROR"


class Adapter(ABC):
    """One automation endpoint participating in a lockstep run.

    `name` is the instance label used in artifacts (e.g. "sh3d", "tauri");
    `app` is the hello identity ("sh3d-driver" | "homely" | "mock").
    """

    name: str
    app: str

    @abstractmethod
    async def start(self) -> None: ...

    @abstractmethod
    async def stop(self) -> None: ...

    @abstractmethod
    async def request(self, command: str, params: dict[str, Any] | None = None) -> Any:
        """Send one command envelope; return response data or raise AdapterError."""

    async def get_state(self) -> dict[str, Any]:
        return await self.request("get_state")

    async def get_capabilities(self) -> dict[str, Any]:
        return await self.request("get_capabilities")

    async def screenshot_bytes(self, view: str = "plan", width: int = 800, height: int = 600) -> bytes:
        data = await self.request("screenshot", {"view": view, "width": width, "height": height})
        return base64.b64decode(data["pngBase64"])
