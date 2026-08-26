"""Pixel comparison of adapter screenshots.

The state deep-diff proves the model matches; this comparator proves the
rendered pixels do too. Two PNGs are compared per pixel (max absolute
channel delta above ``pixel_tolerance`` counts as differing) and reduced
to one score: the fraction of differing pixels. ``matched`` flips to False
once the score exceeds ``threshold``, which is what a scenario verdict keys
on. A red-on-white heatmap of differing pixels can be written alongside for
reports; baselines are keyed ``{platform}-{mode}`` upstream (C4 wiring).
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

# Default: any pixel difference fails; scenarios loosen this per case.
DEFAULT_THRESHOLD = 0.0


@dataclass(frozen=True)
class VisualResult:
    """Structured outcome of one PNG comparison."""

    matched: bool
    score: float  # fraction of differing pixels, 0..1
    threshold: float
    differentPixels: int
    totalPixels: int
    maxDelta: int | None  # largest per-channel delta; None on size mismatch
    sizeMismatch: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "matched": self.matched,
            "score": self.score,
            "threshold": self.threshold,
            "differentPixels": self.differentPixels,
            "totalPixels": self.totalPixels,
            "maxDelta": self.maxDelta,
            "sizeMismatch": self.sizeMismatch,
        }


def _load_png(source: bytes | Path) -> Image.Image:
    if isinstance(source, Path):
        return Image.open(source).convert("RGB")
    return Image.open(io.BytesIO(source)).convert("RGB")


def compare_images(
    expected: bytes | Path,
    actual: bytes | Path,
    *,
    threshold: float = DEFAULT_THRESHOLD,
    pixel_tolerance: int = 0,
    diff_path: str | Path | None = None,
) -> VisualResult:
    """Pixel-diff two PNGs (bytes or file paths).

    A pixel differs when its max per-channel delta exceeds ``pixel_tolerance``
    (anti-aliasing slack); the image matches when the differing fraction stays
    at or below ``threshold``. Different sizes never match. When ``diff_path``
    is given, a heatmap PNG (red where pixels differ) is written there.
    """
    expected_img = _load_png(expected)
    actual_img = _load_png(actual)
    if expected_img.size != actual_img.size:
        width, height = expected_img.size
        return VisualResult(
            matched=False,
            score=1.0,
            threshold=threshold,
            differentPixels=width * height,
            totalPixels=width * height,
            maxDelta=None,
            sizeMismatch=True,
        )

    expected_arr = np.asarray(expected_img, dtype=np.int16)
    actual_arr = np.asarray(actual_img, dtype=np.int16)
    delta = np.abs(expected_arr - actual_arr).max(axis=2)
    mask = delta > pixel_tolerance
    total_pixels = int(delta.size)
    different_pixels = int(mask.sum())
    score = round(different_pixels / total_pixels, 6) if total_pixels else 0.0

    if diff_path is not None:
        heatmap = np.full((*mask.shape, 3), 255, dtype=np.uint8)
        heatmap[mask] = (255, 0, 0)
        out = Path(diff_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(heatmap).save(out)

    return VisualResult(
        matched=score <= threshold,
        score=score,
        threshold=threshold,
        differentPixels=different_pixels,
        totalPixels=total_pixels,
        maxDelta=int(delta.max()) if total_pixels else 0,
    )
