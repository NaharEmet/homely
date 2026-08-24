"""Cross-adapter object identity matching.

Adapter-assigned ids are opaque (sh3d and homely mint different ids for the
same logical wall), so objects are matched by *creation order*: the C2
orchestrator records per-checkpoint ``created``/``removed`` id lists per
adapter, and the Nth wall created by adapter A is the Nth wall created by
adapter B. Levels, which form the static skeleton of a home, pair positionally.

The resulting :class:`IdMap` rewrites one state into the other's id space so
:func:`eq.comparators.diff.compare_states` can diff documents directly.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from typing import Any

COLLECTIONS = ("walls", "rooms", "furniture", "dimensionLines", "labels")


def _creation_orders(
    ledger_entries: Iterable[Mapping[str, Any]],
) -> dict[str, dict[str, list[str]]]:
    """adapter -> collection -> [ids in creation order]."""
    orders: dict[str, dict[str, list[str]]] = {}
    for entry in ledger_entries:
        per_adapter = orders.setdefault(entry["adapter"], {c: [] for c in COLLECTIONS})
        created = entry.get("created") or {}
        for coll, ids in created.items():
            per_adapter.setdefault(coll, []).extend(ids)
    return orders


@dataclass
class IdMap:
    """Maps expected-side (reference) ids to actual-side ids."""

    levels: list[tuple[str, str]] = field(default_factory=list)
    objects: dict[str, dict[str, str]] = field(default_factory=dict)
    mismatches: list[dict[str, Any]] = field(default_factory=list)

    def inverse_levels(self) -> dict[str, str]:
        return {b: a for a, b in self.levels}

    def inverse_objects(self) -> dict[str, dict[str, str]]:
        return {coll: {b: a for a, b in pairs.items()} for coll, pairs in self.objects.items()}

    def rewrite_actual(self, state: Mapping[str, Any]) -> dict[str, Any]:
        """Return a copy of ``state`` with ids renamed into reference-id space."""
        inv_levels = self.inverse_levels()
        inv_objects = self.inverse_objects()
        all_ids: dict[str, str] = {}
        for mapping in inv_objects.values():
            all_ids.update(mapping)

        out: dict[str, Any] = dict(state)
        out["levels"] = [
            {**level, "id": inv_levels.get(level["id"], level["id"])}
            if isinstance(level, Mapping) and "id" in level
            else level
            for level in state.get("levels", [])
        ]
        for coll in COLLECTIONS:
            if coll not in out or not isinstance(out[coll], list):
                continue
            coll_inv = inv_objects.get(coll, {})
            renamed = []
            for item in out[coll]:
                if isinstance(item, Mapping) and isinstance(item.get("id"), str):
                    item = {**item, "id": coll_inv.get(item["id"], item["id"])}
                if (
                    isinstance(item, Mapping)
                    and isinstance(item.get("levelRef"), str)
                ):
                    item = {
                        **item,
                        "levelRef": inv_levels.get(item["levelRef"], item["levelRef"]),
                    }
                renamed.append(item)
            out[coll] = renamed
        if isinstance(out.get("selection"), list):
            out["selection"] = [all_ids.get(sel, sel) if isinstance(sel, str) else sel for sel in out["selection"]]
        return out

    def lookup_level_ref(self, ref: str | None) -> str | None:
        if ref is None:
            return None
        return self.inverse_levels().get(ref, ref)


def _pair_by_ordinal(
    list_a: list[str], list_b: list[str]
) -> tuple[list[tuple[str, str]], list[str], list[str]]:
    pairs = [(a, b) for a, b in zip(list_a, list_b)]
    return pairs, list_a[len(list_b):], list_b[len(list_a):]


def build_id_map(
    state_a: Mapping[str, Any],
    state_b: Mapping[str, Any],
    ledger_entries: Iterable[Mapping[str, Any]] | None = None,
    *,
    adapter_a: str | None = None,
    adapter_b: str | None = None,
) -> IdMap:
    """Match object identities between two states.

    Strategy per collection:

    1. ledger creation ordinals (when ledger entries are available),
    2. leftover items with identical ids on both sides,
    3. remaining leftovers paired by their relative order.

    Collection count differences are recorded in ``IdMap.mismatches``; the
    leftover extras surface as count failures during the state diff.
    """
    id_map = IdMap()

    levels_a = [lv.get("id") for lv in state_a.get("levels", []) if isinstance(lv, Mapping)]
    levels_b = [lv.get("id") for lv in state_b.get("levels", []) if isinstance(lv, Mapping)]
    id_map.levels = [
        (a, b) for a, b in zip(levels_a, levels_b) if isinstance(a, str) and isinstance(b, str)
    ]

    orders: dict[str, dict[str, list[str]]] = {}
    if ledger_entries is not None:
        raw = _creation_orders(ledger_entries)
        if adapter_a and adapter_b:
            orders = {
                side: raw.get(name, {c: [] for c in COLLECTIONS})
                for side, name in (("a", adapter_a), ("b", adapter_b))
            }
        elif len(raw) == 2:
            names = sorted(raw)
            orders = {"a": raw[names[0]], "b": raw[names[1]]}

    present_a = {coll: _ids_in(state_a.get(coll, [])) for coll in COLLECTIONS}
    present_b = {coll: _ids_in(state_b.get(coll, [])) for coll in COLLECTIONS}

    for coll in COLLECTIONS:
        pairs: list[tuple[str, str]] = []
        used_a: set[str] = set()
        used_b: set[str] = set()
        if orders:
            ord_pairs, extra_a, extra_b = _pair_by_ordinal(
                orders.get("a", {}).get(coll, []), orders.get("b", {}).get(coll, [])
            )
            for id_a, id_b in ord_pairs:
                if id_a in present_a[coll] or id_b in present_b[coll]:
                    pairs.append((id_a, id_b))
                    used_a.add(id_a)
                    used_b.add(id_b)
            del extra_a, extra_b  # leftovers handled below together with unpaired ids
        leftover_a = [i for i in present_a[coll] if i not in used_a]
        leftover_b = [i for i in present_b[coll] if i not in used_b]
        same = [i for i in leftover_a if i in leftover_b]
        for i in same:
            pairs.append((i, i))
            used_a.add(i)
            used_b.add(i)
        rest_a = [i for i in leftover_a if i not in used_a]
        rest_b = [i for i in leftover_b if i not in used_b]
        pairs.extend(zip(rest_a, rest_b))

        if len(present_a[coll]) != len(present_b[coll]):
            id_map.mismatches.append(
                {
                    "collection": coll,
                    "expected": len(present_a[coll]),
                    "actual": len(present_b[coll]),
                }
            )
        id_map.objects[coll] = dict(pairs)
    return id_map


def _ids_in(items: Iterable[Any]) -> list[str]:
    return [item["id"] for item in items if isinstance(item, Mapping) and isinstance(item.get("id"), str)]
