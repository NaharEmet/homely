from __future__ import annotations

import base64
import json
import os
from pathlib import Path


def _collect_screenshots(qa_dir: Path) -> list[Path]:
    shots: list[Path] = []
    for p in (qa_dir / "results").rglob("*.png"):
        shots.append(p)
    return sorted(shots)


def _vision_review(shot: Path, api_key: str) -> str:
    try:
        import openai  # type: ignore
    except Exception:
        return "vision skipped: openai package not installed"
    client = openai.OpenAI(api_key=api_key)
    data = base64.b64encode(shot.read_bytes()).decode()
    try:
        resp = client.chat.completions.create(
            model=os.environ.get("VISION_MODEL", "gpt-4o-mini"),
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "This is a screenshot of a 3D house design app (plan or 3D view). "
                     "List any visible rendering defects, broken UI, or obviously wrong geometry. "
                     "Reply concisely; say 'OK' if it looks correct."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{data}"}},
                ],
            }],
        )
        return resp.choices[0].message.content or ""
    except Exception as exc:  # noqa: BLE001
        return f"vision error: {exc}"


def run(qa_dir: Path) -> None:
    shots = _collect_screenshots(qa_dir)
    lines = ["# Vision Review", "", "_Screenshots captured for human/agent visual inspection._", ""]
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("VISION_API_KEY")
    for s in shots:
        note = ""
        if api_key:
            note = _vision_review(s, api_key)
        lines.append(f"- `{s.relative_to(qa_dir)}`")
        if note:
            lines.append(f"  - vision: {note}")
    (qa_dir / "REVIEW.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[qa] reviewed {len(shots)} screenshot(s)")
