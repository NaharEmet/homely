"""Lockstep scenario orchestrator (C2).

Executes a Scenario against every registered adapter in lockstep: each step's
command fans out to all adapters before the next step runs. At every
checkpoint the requested artifacts are captured per adapter:

- `state`  -> states/<adapter>/step-N.json   (+ creation-order ledger diff)
- `plan`/`3d` -> screenshots/<adapter>/step-N-<view>.png

Cross-app object correspondence is recorded by diffing state-export ids per
collection between checkpoints — the "creation-order ledger" consumed by the
comparators; raw ids are never assumed to match across apps.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from eq.adapters.base import Adapter, AdapterError
from eq.adapters.mock import COLLECTIONS, MockAdapter
from eq.dsl.schema import Scenario

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_RESULTS_ROOT = REPO_ROOT / "results"
DEFAULT_SCREENSHOT_SIZE = (800, 600)
REQUEST_TIMEOUT = 60.0


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "scenario"


@dataclass
class RunResult:
    run_id: str
    artifacts_dir: Path
    ok: bool
    errors: list[dict[str, Any]] = field(default_factory=list)

    @property
    def summary(self) -> dict[str, Any]:
        return {
            "runId": self.run_id,
            "artifactsDir": str(self.artifacts_dir),
            "ok": self.ok,
            "errorCount": len(self.errors),
        }


def build_mock_adapters(scenario: Scenario) -> dict[str, MockAdapter]:
    """One mock per compared app: sh3d original + one clone per target mode."""
    adapters: dict[str, MockAdapter] = {"sh3d": MockAdapter(name="sh3d")}
    for mode in scenario.target.mode:
        adapters.setdefault(mode, MockAdapter(name=mode))
    return adapters


def _collect_ids(state: Mapping[str, Any]) -> dict[str, set[str]]:
    return {
        coll: {obj["id"] for obj in state.get(coll, [])}
        for coll in COLLECTIONS
    }


class Orchestrator:
    def __init__(
        self,
        scenario: Scenario,
        adapters: Mapping[str, Adapter],
        results_root: Path | None = None,
        screenshot_size: tuple[int, int] = DEFAULT_SCREENSHOT_SIZE,
    ):
        if not adapters:
            raise ValueError("orchestrator needs at least one adapter")
        names = list(adapters.keys())
        if len(set(names)) != len(names):
            raise ValueError(f"duplicate adapter names: {names}")
        self.scenario = scenario
        self.adapters = dict(adapters)
        self.results_root = Path(results_root) if results_root else DEFAULT_RESULTS_ROOT
        self.screenshot_size = screenshot_size

    async def run(self) -> RunResult:
        started = datetime.now(UTC)
        run_id = f"{started:%Y%m%d-%H%M%S}-{slugify(self.scenario.name)}"
        run_dir = self.results_root / run_id
        (run_dir / "states").mkdir(parents=True, exist_ok=True)
        (run_dir / "screenshots").mkdir(parents=True, exist_ok=True)

        manifest = {
            "schemaVersion": 1,
            "runId": run_id,
            "startedAt": started.isoformat(),
            "scenarioName": self.scenario.name,
            "description": self.scenario.description,
            "target": self.scenario.target.model_dump(mode="json"),
            "adapters": sorted(self.adapters),
            "stepCount": len(self.scenario.steps),
            "checkpoints": [cp.model_dump(mode="json") for cp in self.scenario.checkpoints],
            "assertions": [a.model_dump(mode="json") for a in self.scenario.assertions],
            "assertionsEvaluatedBy": "eq.comparators (C3/C4)",
        }
        (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        actions: list[dict[str, Any]] = []
        ledger: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        prev_ids: dict[str, dict[str, set[str]]] = {}
        for name, adapter in self.adapters.items():
            try:
                state = await asyncio.wait_for(adapter.request("get_state"), REQUEST_TIMEOUT)
                prev_ids[name] = _collect_ids(state)
            except AdapterError as exc:
                errors.append({"phase": "baseline", "adapter": name, "code": exc.code, "error": exc.error})
                prev_ids[name] = {coll: set() for coll in COLLECTIONS}
            except Exception as exc:  # noqa: BLE001 - baseline is best-effort
                errors.append({"phase": "baseline", "adapter": name, "code": "INTERNAL", "error": str(exc)})
                prev_ids[name] = {coll: set() for coll in COLLECTIONS}

        checkpoints = {cp.afterStep: cp for cp in self.scenario.checkpoints}
        plan = [("setup", i, step) for i, step in enumerate(self.scenario.setup, 1)]
        plan += [("steps", i, step) for i, step in enumerate(self.scenario.steps, 1)]

        for phase, index, step in plan:
            entry: dict[str, Any] = {
                "phase": phase,
                "step": index,
                "command": step.command,
                "params": step.params,
                "responses": {},
            }
            started_at = time.perf_counter()
            responses = await asyncio.gather(
                *(
                    self._request_one(name, adapter, step.command, step.params)
                    for name, adapter in self.adapters.items()
                )
            )
            entry["elapsedMs"] = round((time.perf_counter() - started_at) * 1000, 3)
            for name, outcome in zip(self.adapters, responses):
                ok, payload = outcome
                if not ok:
                    errors.append({"phase": phase, "step": index, "adapter": name, **payload})
                    entry["responses"][name] = {"ok": False, **payload}
                else:
                    entry["responses"][name] = {"ok": True, **payload}
            actions.append(entry)

            if phase != "steps":
                continue
            checkpoint = checkpoints.get(index)
            if checkpoint is None:
                continue
            for name, adapter in self.adapters.items():
                await self._capture(run_dir, name, adapter, index, checkpoint.capture, ledger, prev_ids, errors)

        (run_dir / "actions.json").write_text(json.dumps(actions, indent=2), encoding="utf-8")
        (run_dir / "ledger.json").write_text(json.dumps(ledger, indent=2), encoding="utf-8")
        (run_dir / "errors.json").write_text(json.dumps(errors, indent=2), encoding="utf-8")
        return RunResult(run_id=run_id, artifacts_dir=run_dir, ok=not errors, errors=errors)

    async def _request_one(
        self,
        name: str,
        adapter: Adapter,
        command: str,
        params: dict[str, Any],
    ) -> tuple[bool, dict[str, Any]]:
        try:
            data = await asyncio.wait_for(adapter.request(command, params), REQUEST_TIMEOUT)
            return True, {"data": data}
        except AdapterError as exc:
            return False, {"error": exc.error, "code": exc.code}
        except TimeoutError:
            return False, {"error": f"timeout after {REQUEST_TIMEOUT}s", "code": "TIMEOUT"}
        except Exception as exc:  # noqa: BLE001 - transport/impl failures become error records
            return False, {"error": str(exc), "code": "INTERNAL"}

    async def _capture(
        self,
        run_dir: Path,
        name: str,
        adapter: Adapter,
        step_index: int,
        capture_kinds: list[str],
        ledger: list[dict[str, Any]],
        prev_ids: dict[str, dict[str, set[str]]],
        errors: list[dict[str, Any]],
    ) -> None:
        if "state" in capture_kinds:
            try:
                state = await asyncio.wait_for(adapter.request("get_state"), REQUEST_TIMEOUT)
            except AdapterError as exc:
                errors.append(
                    {
                        "phase": "capture",
                        "step": step_index,
                        "adapter": name,
                        "artifact": "state",
                        "code": exc.code,
                        "error": exc.error,
                    }
                )
                return
            except Exception as exc:  # noqa: BLE001
                errors.append(
                    {
                        "phase": "capture",
                        "step": step_index,
                        "adapter": name,
                        "artifact": "state",
                        "code": "INTERNAL",
                        "error": str(exc),
                    }
                )
                return
            state_dir = run_dir / "states" / name
            state_dir.mkdir(exist_ok=True)
            (state_dir / f"step-{step_index}.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
            current = _collect_ids(state)
            before = prev_ids.get(name, {})
            created = {coll: sorted(current[coll] - before.get(coll, set())) for coll in COLLECTIONS}
            removed = {coll: sorted(before.get(coll, set()) - current[coll]) for coll in COLLECTIONS}
            ledger.append({"adapter": name, "step": step_index, "created": created, "removed": removed})
            prev_ids[name] = current
        for kind in ("plan", "3d"):
            if kind not in capture_kinds:
                continue
            width, height = self.screenshot_size
            try:
                png = await adapter.screenshot_bytes(view=kind, width=width, height=height)
            except AdapterError as exc:
                errors.append(
                    {
                        "phase": "capture",
                        "step": step_index,
                        "adapter": name,
                        "artifact": kind,
                        "code": exc.code,
                        "error": exc.error,
                    }
                )
                continue
            except Exception as exc:  # noqa: BLE001
                errors.append(
                    {
                        "phase": "capture",
                        "step": step_index,
                        "adapter": name,
                        "artifact": kind,
                        "code": "INTERNAL",
                        "error": str(exc),
                    }
                )
                continue
            shot_dir = run_dir / "screenshots" / name
            shot_dir.mkdir(parents=True, exist_ok=True)
            view_label = "plan" if kind == "plan" else "3d"
            (shot_dir / f"step-{step_index}-{view_label}.png").write_bytes(png)
