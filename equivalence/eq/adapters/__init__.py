"""Adapter layer + orchestrator for the equivalence harness (Track C)."""

from eq.adapters.base import Adapter, AdapterError
from eq.adapters.mock import MockAdapter
from eq.adapters.orchestrator import Orchestrator, RunResult, build_mock_adapters
from eq.adapters.server import AutomationServer, Session

__all__ = [
    "Adapter",
    "AdapterError",
    "AutomationServer",
    "MockAdapter",
    "Orchestrator",
    "RunResult",
    "Session",
    "build_mock_adapters",
]
