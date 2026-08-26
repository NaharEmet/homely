"""HomelyAdapter: wraps an AutomationServer session behind the Adapter ABC.

The homely app connects IN to ws://127.0.0.1:$HOMELY_AUTOMATION_PORT
(homely/src/automation/client.ts) and announces hello `app:"homely"`; this
adapter waits for that session on an already-started AutomationServer and
delegates requests to it. The server's lifecycle (ports, env wiring for the
launched app) belongs to the caller; `start()` only adopts the session.
"""

from __future__ import annotations

from typing import Any

from eq.adapters.base import Adapter, AdapterError
from eq.adapters.server import AutomationServer, Session


class HomelyAdapter(Adapter):
    def __init__(
        self,
        name: str,
        server: AutomationServer,
        app: str = "homely",
        timeout: float = 10.0,
    ):
        self.name = name
        self.server = server
        self.app = app
        self.timeout = timeout
        self._session: Session | None = None

    async def start(self) -> None:
        self._session = await self.server.wait_for_session(self.app, self.timeout)

    async def stop(self) -> None:
        if self._session is not None:
            self._session.fail_all("adapter stopped", "ADAPTER_STOPPED")
            self.server.sessions.pop(self.app, None)
        self._session = None

    async def request(self, command: str, params: dict[str, Any] | None = None) -> Any:
        if self._session is None:
            raise AdapterError(f"no session announced app='{self.app}'", "NOT_STARTED")
        return await self._session.request(command, params)
