"""Comparators: state deep-diff, ledger object matching, metrics, assertions.

Consumed by the reporting CLI (C4): ``compare_artifacts`` turns an orchestrator
run directory into a verdict with pinpointed failures.
"""

from eq.comparators.assertions import evaluate_assertion, evaluate_assertions, resolve_path
from eq.comparators.diff import (
    ANGLE_TOLERANCE,
    POS_TOLERANCE,
    RADIAN_TOLERANCE,
    Failure,
    compare_states,
    deep_diff,
    tolerance_for,
)
from eq.comparators.match import COLLECTIONS, IdMap, build_id_map
from eq.comparators.metrics import (
    METRIC_TOLERANCE,
    geometry_summary,
    metric_deltas,
    polygon_area,
    polygon_perimeter,
    room_points,
    wall_length,
)
from eq.comparators.run import compare_artifacts, write_comparison
from eq.comparators.visual import VisualResult, compare_images

__all__ = [
    "ANGLE_TOLERANCE",
    "COLLECTIONS",
    "METRIC_TOLERANCE",
    "POS_TOLERANCE",
    "RADIAN_TOLERANCE",
    "Failure",
    "IdMap",
    "VisualResult",
    "build_id_map",
    "compare_artifacts",
    "compare_images",
    "compare_states",
    "deep_diff",
    "evaluate_assertion",
    "evaluate_assertions",
    "geometry_summary",
    "metric_deltas",
    "polygon_area",
    "polygon_perimeter",
    "resolve_path",
    "room_points",
    "tolerance_for",
    "wall_length",
    "write_comparison",
]
