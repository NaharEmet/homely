from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

OPENCODE = "/home/nahar/.opencode/bin/opencode"


def _parse_issues(qa_dir: Path) -> list[dict]:
    text = (qa_dir / "ISSUES.md").read_text()
    out = []
    for block in re.split(r"\n##\s+\d+\.", text):
        m = re.search(r"\[(\w+)\]\s+`?([\w./-]+)`?\s*\(step\s+([\d?]+)\)", block)
        if not m:
            continue
        out.append({
            "type": m.group(1),
            "command": m.group(2),
            "step": m.group(3),
            "scenario": (re.search(r"scenario: `([^`]+)`", block) or [None, "?"])[1],
            "code": (re.search(r"code: `([^`]+)`", block) or [None, ""])[1],
            "detail": (re.search(r"detail: (.+)", block) or [None, ""])[1],
        })
    return out


def _dispatch(qa_dir: Path, issue: dict) -> str:
    prompt = (
        f"Fix a Homely QA bug found by the autonomous qa-loop.\n"
        f"Scenario: {issue['scenario']}\nCommand/area: {issue['command']} (step {issue['step']})\n"
        f"Error code: {issue['code']}\nDetail: {issue['detail']}\n\n"
        f"The app automation handler is in homely/src/automation/homely-handler.ts and the "
        f"bootstrap in homely/src/main.ts. Apply a minimal root-cause fix, then verify by "
        f"re-running `python qa-loop/run.py` from the repo root and confirm the issue no longer "
        f"appears in qa-loop/ISSUES.md. Do not commit."
    )
    try:
        r = subprocess.run(
            [OPENCODE, "run", prompt], cwd=qa_dir.parent,
            capture_output=True, text=True, timeout=1800,
        )
        return f"exit={r.returncode}"
    except Exception as exc:  # noqa: BLE001
        return f"dispatch-failed: {exc}"


def run(qa_dir: Path, dry: bool = False) -> None:
    issues = _parse_issues(qa_dir)
    if not issues:
        print("[qa] no open issues to fix")
        return
    for issue in issues:
        print(f"[qa] fixing {issue['command']} ({issue['scenario']}) ...")
        if dry:
            print(f"[qa]   (dry) prompt would dispatch opencode for: {issue['detail']}")
            continue
        result = _dispatch(qa_dir, issue)
        print(f"[qa]   -> {result}")
        # record dispatch so we don't loop forever; next run re-verifies
        with (qa_dir / "qa_results.json").open() as f:
            data = json.load(f)
        data.setdefault("fixes", []).append({"issue": issue, "result": result})
        (qa_dir / "qa_results.json").write_text(json.dumps(data, indent=2))
