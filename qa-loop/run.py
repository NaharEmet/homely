from __future__ import annotations

import asyncio
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EQUIV = REPO / "equivalence"
sys.path.insert(0, str(EQUIV))

from eq.adapters.server import AutomationServer  # noqa: E402
from eq.adapters.homely import HomelyAdapter  # noqa: E402
from eq.adapters.orchestrator import Orchestrator  # noqa: E402
from eq.dsl.loader import load_scenario  # noqa: E402

HOMELY = REPO / "homely"
QA = Path(__file__).resolve().parent
SCENARIOS = QA / "scenarios"


def _wait_for_vite(timeout: float = 60.0) -> None:
    url = "http://localhost:1420/"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("vite dev server did not come up on :1420")


async def run_all(fix: bool = False, dry: bool = False) -> int:
    server = AutomationServer()
    await server.start()
    ws_port = server.ws_port
    print(f"[qa] automation ws on port {ws_port}")

    vite = subprocess.Popen(
        ["npm", "run", "dev"], cwd=HOMELY,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        _wait_for_vite()
        boot = subprocess.Popen(["node", str(QA / "boot.mjs"), str(ws_port)], cwd=HOMELY)
        try:
            adapter = HomelyAdapter(name="homely", server=server, app="homely", timeout=30.0)
            await adapter.start()
            print("[qa] homely session connected")

            results: list[dict] = []
            for yf in sorted(SCENARIOS.glob("*.yaml")):
                scenario = load_scenario(yf)
                rr = await Orchestrator(scenario, {"homely": adapter}, QA / "results").run()
                results.append({
                    "scenario": yf.name,
                    "runId": rr.run_id,
                    "artifactsDir": str(rr.artifacts_dir),
                    "ok": rr.ok,
                    "errorCount": len(rr.errors),
                    "errors": rr.errors,
                })
                print(f"[qa] scenario {yf.name}: {'OK' if rr.ok else 'ISSUES=' + str(len(rr.errors))}")

            qa_results = {
                "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "wsPort": ws_port,
                "scenarios": results,
            }
            (QA / "qa_results.json").write_text(json.dumps(qa_results, indent=2), encoding="utf-8")

            import analyze
            analyze.run(QA, qa_results)
            import review
            review.run(QA)

            if fix:
                import fix_loop
                fix_loop.run(QA, dry=dry)

            return 0 if all(r["ok"] for r in results) else 1
        finally:
            boot.terminate()
    finally:
        vite.terminate()
        await server.stop()


def main() -> None:
    import argparse
    p = argparse.ArgumentParser(description="Autonomous Homely QA loop")
    p.add_argument("--fix", action="store_true", help="dispatch opencode to fix open issues")
    p.add_argument("--dry", action="store_true", help="with --fix, print prompts without dispatching")
    args = p.parse_args()
    raise SystemExit(asyncio.run(run_all(fix=args.fix, dry=args.dry)))


if __name__ == "__main__":
    main()
