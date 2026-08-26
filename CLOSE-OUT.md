# Homely Close-Out Report

**Date**: 2026-08-26 14:30 IST
**Integrator**: grace (naharemete)
**Branch**: main

---

## Summary

All 22 board tickets (4 Track D, 4 Track A, 9 Track B, 9 Track C, minus B0/A0) are
**done**. The Homely clone achieves 0-diff parity with the real Java SH3D driver on
the create_room vertical slice. The equivalence harness runs E2E against both live
apps with no state failures.

## Final Gate Results

| Gate | Result |
|------|--------|
| E2E live (create_room vs real driver :9450 + real Tauri) | **1/1 passed**, 0 state diffs |
| pytest (harness) | **98/98 passed** in 0.68s |
| vitest (clone) | **112/112 passed** in 366ms |
| ruff (harness) | clean |
| tsc --noEmit (clone) | clean |
| eslint (clone) | clean |
| vite build (clone) | clean |

## Tickets Completed

| Ticket | Title | Track | Commit | Notes |
|--------|-------|-------|--------|-------|
| D0 | repo-init | grace | (initial) | git, skeleton, toolchain |
| D1 | contracts | grace | (initial) | schema+protocol+arch map |
| D2 | golden-and-slice | grace | b3073da | E2E scenario + golden + expected-state |
| D3 | docs-matrix | grace | e2f534a | features.yaml, agent handbook, behaviour template |
| A1 | driver-boot | driver-dev | (early) | 9/9 smoke |
| A2 | driver-interact | driver-dev | (early) | 26/26 smoke, 4-wall room + undo/redo |
| A3 | driver-state | driver-dev | (early) | 46/46 smoke, schema validation |
| A4 | driver-capture-io | driver-dev | (early) | 63/63 smoke, save/open round-trip |
| B1 | homely-scaffold | clone-dev | 3650f6b | Tauri + WS hello/ping |
| B2 | homely-core | clone-dev | 0294efd | Model store, undo/redo, export |
| B3 | plan-view | clone-dev | e04c399 | PlanEngine wall tool state machine |
| B4 | view3d | clone-dev | (early) | Three.js scene + cameras |
| B5 | homely-capture | clone-dev | f023353 | Offscreen capture service |
| B6 | plan-parity-autoroom | grace | b3147c3 | No room auto-creation (SH3D parity) |
| B7 | top-camera-follower | clone-dev | 1c7b724 | SH3D TopCameraState port |
| B8 | export-parity-defaults | clone-dev | 1b11558 | thickness 7, hatchUp, wallsAlpha, compass TZ, camera ids, rounding |
| B9 | wall-id-draw-order | clone-dev | 3d5a1e8 | Per-click addWall, draw-order ids |
| C1 | dsl | harness-dev | (early) | YAML scenario schema + loader |
| C2 | orchestrator | harness-dev | (early) | WS server + adapters + lockstep runner |
| C3 | comparators | harness-dev | (early) | Deep-diff + tolerances + ledger matching |
| C4 | reporting-cli | harness-dev | (early) | results tree + ./test-equivalence |
| C5 | visual-diff | harness-dev | af4b18e | Pillow compare + heatmap |
| C6 | live-adapters | harness-dev | ac2f77b | Sh3dAdapter + HomelyAdapter |
| C7 | runner-live | harness-dev | 6680ba4 | Live E2E orchestrator |
| C8 | comparator-null-normalize | harness-dev | b0a7501 | absent == null normalization |
| C9 | baseline-after-setup | harness-dev | 19bb4ea | Ledger baseline capture fix |

## Contract Changes Made

| Commit | Change | Rationale |
|--------|--------|-----------|
| d69fccb | driver: honor dbl click param + protocol tool names | ws-protocol.md:60 click{dbl:true} + frozen tool names |
| 41cbcfc | docs: Etc/GMT→Greenwich (51.466667,0) corrected | Compass.java:673 verified against source |
| e2f534a | docs: angle wrap [-180,180) not (-180,180] | B8 testing confirmed driver exports -180.0 for yaw π |

## Deviations from Plan

1. **B6 implemented by integrator** (not clone-dev): the no-autoroom change was a contract fix.
2. **B7 mitered corners**: contract doc said "thick-polygon corner points"; implementation
   required mitered join detection to match driver row-3 center exactly.
3. **B8 Etc/GMT→Greenwich**: kickoff prompt said (0,0); Compass.java:673 says Greenwich
   Observatory (51.466667, 0); contract doc corrected.
4. **C9 was unplanned**: discovered during E2E run 2 (ledger baseline bug). Added as new ticket.
5. **B9 was unplanned**: discovered during E2E run 2 (wall id rotation). Added as new ticket.
6. **D0 repo-init not counted**: initial setup, pre-board.
7. **Driver instrumented during D2**: temporary PropertyChangeListener on top camera, then reverted.
8. **fresh() called after new_home**: in test scripts, needed to re-create adapters after state reset.

## Remaining Risks

1. **Single scenario**: only create_room (4 walls) is tested. Room tool, furniture, doors/windows,
   levels, dimension lines, polyline, text, import/export round-trip not yet E2E tested.
2. **Linux-only**: no macOS/Windows CI. Tauri window visible requirement limits CI options.
3. **No visual comparison**: C5 (visual-diff) code exists but not wired into E2E assertions.
4. **Arc walls**: bounds treated as straight in camera follower (B7 deviation).
5. **Selection path**: TopCameraState's `aerialViewCenteredOnSelectionEnabled` not tested
   (defaults FALSE in SH3D — inert).
6. **Stale driver sessions**: E2E runs on a long-lived driver accumulate state; fresh driver
   recommended per run.
7. **Non-interactive PATH**: cargo/rust not on PATH in non-interactive shells; must prefix
   `PATH="$HOME/.cargo/bin:$PATH"`.

## Verification Evidence

| Artifact | Path |
|----------|------|
| E2E run output | `results/20260826-142844-suite/` |
| Comparison JSON | `results/20260826-142844-suite/comparison.json` |
| Golden .sh3d | `equivalence/scenarios/slice/goldens/create_room.sh3d` |
| Expected state | `equivalence/scenarios/slice/goldens/create_room.expected-state.json` |
| Driver on port 9450 | Running, clean build (instrumentation reverted) |
