"""YAML loading + error formatting for scenario files.

Every validation issue is reported as `path: message` where path looks like
`steps[2].command` or `checkpoints[0].afterStep`, so a failing scenario names
exactly which step/field to fix.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from eq.dsl.schema import Scenario


class ScenarioLoadError(Exception):
    """Raised when a scenario YAML cannot be parsed or validated.

    `.issues` holds one human-readable string per problem, each naming the
    offending location (e.g. "steps[3].command: unknown command 'cliuck'").
    """

    def __init__(self, issues: list[str]) -> None:
        self.issues = issues
        super().__init__("scenario validation failed:\n  " + "\n  ".join(issues))


def _format_loc(loc: tuple[Any, ...]) -> str:
    parts: list[str] = []
    for item in loc:
        if isinstance(item, int):
            index = f"[{item}]"
            if parts:
                parts[-1] += index
            else:
                parts.append(index)
        else:
            parts.append(str(item))
    return ".".join(parts)


def _clean_msg(msg: str) -> str:
    # pydantic prefixes validator errors with "Value error, "
    for prefix in ("Value error, ", "Assertion failed, "):
        if msg.startswith(prefix):
            return msg[len(prefix) :]
    return msg


def parse_scenario(data: Any) -> Scenario:
    """Validate an already-parsed YAML mapping into a Scenario."""
    try:
        return Scenario.model_validate(data)
    except ValidationError as exc:
        issues = [
            f"{_format_loc(err['loc']) or '<root>'}: {_clean_msg(err['msg'])}"
            for err in exc.errors()
        ]
        raise ScenarioLoadError(issues) from exc


def load_scenario(path: str | Path) -> Scenario:
    """Load and validate a scenario YAML file."""
    file = Path(path)
    try:
        raw = file.read_text(encoding="utf-8")
    except OSError as exc:
        raise ScenarioLoadError([f"{file}: cannot read file ({exc})"]) from exc
    try:
        data = yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        raise ScenarioLoadError([f"{file}: invalid YAML ({exc})"]) from exc
    if not isinstance(data, dict):
        raise ScenarioLoadError(
            [f"{file}: top-level document must be a mapping, got {type(data).__name__}"]
        )
    try:
        return parse_scenario(data)
    except ScenarioLoadError as exc:
        exc.issues = [f"{file}: {issue}" for issue in exc.issues]
        raise
