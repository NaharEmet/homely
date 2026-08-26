"""Adapter layer + orchestrator for the equivalence harness (Track C)."""

from eq.adapters.base import Adapter, AdapterError
from eq.adapters.homely import HomelyAdapter
from eq.adapters.mock import MockAdapter
from eq.adapters.orchestrator import Orchestrator, RunResult, build_mock_adapters
from eq.adapters.server import AutomationServer, Session
from eq.adapters.sh3d import Sh3dAdapter

__all__ = [
    "Adapter",
    "AdapterError",
    "AutomationServer",
    "HomelyAdapter",
    "MockAdapter",
    "Orchestrator",
    "RunResult",
    "Session",
    "Sh3dAdapter",
    "build_mock_adapters",
]
