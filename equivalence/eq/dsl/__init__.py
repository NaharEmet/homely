"""Scenario DSL: YAML schema + loader for equivalence runs (ticket C1)."""

from eq.dsl.loader import ScenarioLoadError, load_scenario, parse_scenario
from eq.dsl.schema import (
    COMMANDS,
    Assertion,
    Checkpoint,
    Scenario,
    Step,
    Target,
)

__all__ = [
    "COMMANDS",
    "Assertion",
    "Checkpoint",
    "Scenario",
    "ScenarioLoadError",
    "Step",
    "Target",
    "load_scenario",
    "parse_scenario",
]
