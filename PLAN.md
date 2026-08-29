# Homely Build Plan — Multi-Agent Coordination

Rebuild Sweet Home 3D as **Homely** (Tauri + Three.js, local-first) with a
Python equivalence harness that differentially tests the original against the
clone. Read `docs/architecture-map.md` for all research facts — do not
re-explore the SH3D source before reading it.

**Contracts (FROZEN):**
- `docs/schema/home-project.schema.json` — NormalizedHomeState schema v1
- `docs/specs/ws-protocol.md` — automation WebSocket protocol v1

---

## Claim Board

> Agents: to claim a ticket, edit ONLY your row (Claimed-by + Status), then
> commit: `board: claim <TICKET-ID>`. Move Status forward as you work:
> `todo → claimed → in_progress → review`. Only integrator sets `done`.
> Blocked: set status `blocked`, write reason in Notes.

| Ticket | Title | Deps | Owner dir | Track | Claimed-by | Status | Notes |
|--------|-------|------|-----------|-------|------------|--------|-------|
| D0 | repo-init | — | repo root | grace | grace | done | git, skeleton, toolchain |
| D1 | contracts | D0 | docs/ | grace | grace | done | schema+protocol+arch map |
| A1 | driver-boot | D1 | equivalence/driver-java | driver-dev | | done | smoke 9/9 PASS; see ticket README; 2026-08-26 integrator re-verify PASS |
| A2 | driver-interact | A1 | equivalence/driver-java | driver-dev | | done | smoke 26/26 PASS; 4-wall room + undo/redo/copy/paste verified; screenshot via debug_screenshot |
| A3 | driver-state | A2 | equivalence/driver-java | driver-dev | | done | smoke 46/46 PASS; full schema export validated 11x jsonschema; steward lifecycle backfilled OK |
| A4 | driver-capture-io | A2 | equivalence/driver-java | driver-dev | | done | smoke 63/63 PASS (re-run live 2026-08-26); plan+3d captures byte-identical; save/open round-trip stable |
| B1 | homely-scaffold | D1 | homely/ | clone-dev | | done | 3650f6b build+test+smoke+tauri dev window verified; 2026-08-26 cargo build + tauri dev window re-verified on :1 |
| B2 | homely-core | B1 | homely/src/core | clone-dev | | done | 0294efd 44/44 tests, adversarial review 10/10 findings fixed, harness equivalence 22/22+21/21, add_furniture deviation noted in docs/behaviours |
| B3 | plan-view | B2 | homely/src/plan | clone-dev | | done | e04c399 84/84 tests incl equivalence script vs create_room.yaml graph, magnetism+chaining+dbl-close+escape SH3D semantics |
| B4 | view3d | B2 | homely/src/view3d | clone-dev | | done | 58/58 tests (14 view3d), eslint clean, vite build ok; SH3D-exact cameras (world=(x,h,y), rotY(π−yaw)·RotX(−pitch)), live store sync, set_camera/camera_preset; project-wide tsc green as of 2026-08-26 (earlier "blocked by B3 WIP" note stale) |
| B5 | homely-capture | B2 | homely/src/automation | clone-dev | | done | f023353 capture tests green; deterministic offscreen screenshot plan/3d, CaptureService + 10 tests; folded B3's broken-HEAD handler fixes (value import PlanEngine, handshake 15-cmd array) |
| B6 | plan-parity-autoroom | B5 | homely/src/plan | grace | | done | b3147c3 wall tool no longer auto-creates rooms on loop close (SH3D validateDrawnWalls parity, PlanController.java:10912 only posts+selects walls); addWallChain dropped withRoom; tests updated (dbl-close expects rooms=0). Integrator implemented+verified: vitest 84/84, tsc+eslint clean. Driver-side conformance fixes landed earlier (click dbl:true honored; protocol tool names accepted). |
| B7 | top-camera-follower | B5 | homely/src/core | clone-dev | clone-dev | done | 1c7b724 Port SH3D HomeController3D$TopCameraState (HomeController3D.java:823-1330): top camera follows whole-home bounds on item add/delete + property changes. Contract: docs/behaviours/sh3d-camera-and-export.md §1. Follower in core/top-camera-follower.ts wired into HomeStore apply/undo/redo; mitered thick-polygon wall corners (geometric join detection) reproduce contract table incl. row-3 (351.75,248.25) at t=7; camera-only mutations skipped; reset=new default camera. Integrator verified: 99/99 vitest, tsc+eslint clean, vite build ok; test assertions match driver-observed positions exactly. Deviations: NEW_WALL_THICKNESS_CM still 7.5 (B8 fixes); arc walls bounds as straight; selection path skipped per contract. |
| B8 | export-parity-defaults | B5 | homely/src | clone-dev | clone-dev | done | 1b11558 All 6 gaps fixed vs driver golden create_room.expected-state.json: thickness 7; addWallChain stamps patternId 'hatchUp'; wallsAlpha default 0 (+ view3d treats it as TRANSPARENCY per Wall3D.java:1522, was inverted); compass lat/lon from OS TZ via full 603-entry Compass.java port (core/compass-timezones.ts, float32-exact pipeline, zone injectable); camera ids 'camera-top-1'/'camera-observer-1' + observer fixedSize:false; normalizeAngle wraps [-180,180) so yaw π exports -180.0. DEVIATION ACCEPTED: Etc/GMT→Greenwich (51.466667,0) per Compass.java:673, contract doc §2/§3 corrected by integrator (was (-180,180] + (0,0), both wrong vs source/golden). Integrator verified: vitest 109/109, tsc/eslint/build clean; Compass.java Etc/GMT lines re-read. |
| B9 | wall-id-draw-order | B8 | homely/src/plan + homely/src/core | clone-dev | clone-dev | done | 3d5a1e8 Wall tool now commits via model.addWall per click inside HomeStore.begin/endCompoundEdit session; validateDrawnWalls seals + selects session ids in draw order → exported ids wall-1..4. Per-click camera positions match contract §1 exactly. Live E2E 20260826-141802-suite: 0 diffs (validates fix). Harness baseline bug from run 130527 was co-cause (C9 fixed). |
| C1 | dsl | D1 | equivalence/eq/dsl | harness-dev | | done | 19 pytest pass; ruff clean |
| C2 | orchestrator | C1 | equivalence/eq/adapters | harness-dev | | done | mock+ws/tcp server+lockstep runner+ledger; demo run ok=True (2026-08-26); /results/ now gitignored |
| C3 | comparators | C2 | equivalence/eq/comparators | harness-dev | | done | deep-diff tolerances + ledger id-matching + geometry metrics + assertion eval + comparison.json; ruff clean |
| C4 | reporting-cli | C2 | equivalence/eq/reporting | harness-dev | | done | run_suite+summary.json+report.md L0-2 + ./test-equivalence wrapper (--level/--target); 73/73 pytest total (2026-08-26); ruff clean |
| C5 | visual-diff | C2,A4,B5 | equivalence/eq/comparators | harness-dev | | done | af4b18e compare_images→VisualResult (score/threshold/heatmap, size-mismatch never matches), zero new deps (Pillow+numpy); 5 tests incl known-different pair; comparators suite 26/26 + full pytest 86/86, ruff clean (2026-08-26) |
| C6 | live-adapters | C2,A3,B1 | equivalence/eq/adapters | harness-dev | | done | ac2f77b Sh3dAdapter (TCP→FramedServer, reuses Session for id-correlation/timeouts) + HomelyAdapter (adopts AutomationServer session); NOTE wire hello app is "homely" per frozen ws-protocol.md:49 (ticket's "tauri" was wrong) — name="tauri" kept as orchestrator key; 8 fake-transport tests; 86/86 pytest, ruff clean (2026-08-26) |
| C7 | runner-live | C6 | equivalence/eq/reporting | harness-dev | | done | Wire --live path: start AutomationServer (ephemeral ports), wait_for_session(sh3d-driver/homely), build {sh3d,tauri} adapters, run Orchestrator; document app launch (driver ./run.sh <port>; HOMELY_AUTOMATION_PORT=<ws-port> for tauri dev). Exit criteria: create_room.yaml passes vs both real apps. Fixed test hang: _run_live_suite now accepts an injected server (fakes connect to it) and bounds adapter startup with session_timeout; skips are resolved before adapters start; IdMap.rewrite_actual no longer injects a bogus `levels` key. 92/92 pytest green (6 new live-runner tests), ruff clean |
| C8 | comparator-null-normalize | C3 | equivalence/eq/comparators | harness-dev | harness-dev | done | b0a7501 Deep-diff treats absent key == null value (both directions, deep_diff + compare_states); real null/value diffs still fail. Replay of live run 20260826-105922: 21 false positives gone; 18 genuine B7/B8 parity gaps remain (thickness 7.0vs7.5, patternId, compass, top camera pos). Integrator verified: 98/98 pytest (.venv), ruff clean; diff.py change minimal+correct. Goldens untouched. |
| C9 | baseline-after-setup | C8 | equivalence/eq/adapters | harness-dev | harness-dev | done | 19bb4ea Live E2E run 20260826-130527-suite: both raw states (sh3d step-8.json + tauri step-8.json) are IDENTICAL (walls [wall-1..4], selection [wall-1..4]) yet comparator reports 8 id diffs. Root cause: orchestrator.py captures baseline state BEFORE setup; on long-lived driver the baseline picks up stale IDs from prior sessions, then new_home resets ID counter causing reused IDs to cancel in the delta ledger (delta=[wall-3,wall-4] instead of [wall-1..4]). Fix: move baseline capture to AFTER the last setup step (after setup loop completes, before steps begin). Verify: pytest suite + live E2E run shows 0 state diffs. |
| D2 | golden-and-slice | C7,C8,B7,B8,B9,C9 | equivalence/scenarios/slice | grace | grace | done | 20260826-141802-suite Live E2E pass: 0 state failures, 0 assertion failures, ok=true. Scenario: create_room (new_home → select_tool wall → magnetism off → 4 wall clicks → closing click → double_click validate). Both apps connected, identical export states. Verified: results/20260826-141802-suite/summary.json ok=true, comparison.json 0 diffs. Golden + expected-state.json from real driver :9450 unchanged. Chain: C7(runner-live)->C8(comparator-null)->B7(camera)->B8(export-defaults)->B9(wall-ids)->C9(baseline-fix)->D2(E2E). |
| D3 | docs-matrix | D2 | equivalence/matrix | grace | grace | done | features.yaml (2 scenarios + contract coverage matrix), agent handbook (docs/agent-handbook.md), behaviour-notes template (docs/behaviour-notes-template.md). All committed. |
| U1 | ui-layout-shell | B9 | homely/index.html + homely/src/style.css + homely/src/main.ts | clone-dev | clone-dev | done | SH3D-style split layout: menu bar, toolbar row, side-by-side plan+3d panels, status bar. Responsive CSS grid. Dark theme option. Verified: vitest 112/112, tsc clean, eslint clean. |
| U2 | ui-plan-enhance | U1 | homely/src/plan/renderer.ts + homely/src/style.css | clone-dev | clone-dev | done | Plan view polish: grid background (major/minor lines), wall thickness visible as filled shapes not stroked centerlines, room floor fill + area label centered, selection handles (blue outlines + corner dots), zoom-to-fit with scroll wheel, pan with middle-click/Space+drag. |
| U3 | ui-toolbar-tools | U1 | homely/src/main.ts + homely/src/style.css | clone-dev | clone-dev | done | Tool icons (selection/wall/room/dim/text/furniture), undo/redo, camera preset toggle (plan/split/3d), magnetism checkbox, keyboard shortcut tooltips, active tool highlight. Done in U1. |
| U4 | ui-3d-polish | U1 | homely/src/view3d/scene.ts + homely/src/view3d/view.ts | clone-dev | clone-dev | done | 1fcfe8c OrbitControls (orbit/pan/zoom w/ damping), shadow mapping, MeshStandardMaterial, edge lines on walls, selection emissive highlight, fog. 123/123 vitest, tsc/eslint/vite clean. |
| U5 | ui-properties | U3,U2 | homely/src + homely/index.html | clone-dev | clone-dev | done | Properties panel (right sidebar, 280px) showing Wall/Room/Furniture properties with editable fields, live-updates via observeStore, ] toggle. 142/142 vitest, tsc/eslint/vite clean. |
| U6 | wall-vertex-edit | U1 | homely/src/plan + homely/src/core/model.ts + homely/src/main.ts | clone-dev | clone-dev | done | 6870254 HitResult union, endpoint-first hitTest, vertex drag + connected wall chain, blue endpoint handles, cursor mgmt. 127/127 vitest, tsc/eslint/vite clean. |
| A5 | furniture-catalog-driver | A2 | equivalence/driver-java | driver-dev | | done | **Ponytail superseded**: instead of driver-side `list_catalog`/`add_furniture` over the wire (YAGNI), SH3D's real default catalog was ported into homely's `catalog.json` (100 items from `DefaultFurnitureCatalog.properties`, categories mapped to homely's set). Homely is now a faithful clone AND both harness sides share one catalog source of truth. Driver-side exposure deferred until a furniture equivalence scenario exists. DoD reinterpreted: shared catalog enables furniture parity tests; `catalog.test.ts` updated (modelPath optional, real categories). |
| U7 | furniture-catalog-ui | U3,U2 | homely/src/ui + homely/src/core + homely/index.html | clone-dev | clone-dev | done | Catalog panel (left sidebar): category list, search, click-to-place, place mode, undo/redo on placed pieces. Wired into main.ts. |
| U8 | furniture-assets-pipeline | U7 | homely/assets + homely/scripts + homely/src-tauri | clone-dev | clone-dev | done | asset pipeline + GLTF load w/ box fallback; vitest 146 green, tsc/eslint(build)/vite clean; eslint has 4 pre-existing errors in e2e/viewport3d.spec.ts (unrelated WIP) Asset pipeline + bundling: commit generated textures (already in homely/assets/textures/ via generate.py), a build/dev script that regenerates/validates textures, furniture 3D model assets (OBJ/GLB) + catalog manifest, Vite copies `assets/` to dist, Tauri bundles it, renderer loads real models instead of BoxGeometry. DoD: `npm run assets` regenerates textures; `npm run tauri build` bundles assets; 3D view renders furniture models, plan view renders catalog thumbnails; no network fetch at runtime. |

## Track M — Modernization audit (2026-08-28, manager-driven, opencode-delegated)

Live user-perspective audit of `npm run dev` (Playwright-driven, screenshots in
`qa-loop/results/` + ad-hoc captures) found that several U-track tickets above
were marked `done` without their DoD actually holding end-to-end. This track
fixes what a real user hits first, then closes remaining SH3D feature gaps,
then hardens agent-maintainability. Manager (Claude, this session) dispatches
each ticket to an opencode worker, then independently re-verifies before
`done` — same gatekeeper discipline as `engineering-manager.md`.

**Audit findings (evidence for tickets below):**
1. Plan view auto-refits (`fitToBounds`) on *every* render frame until the
   user manually zooms once (`main.ts:646 if (!userHasZoomed)`) — drawing a
   multi-click wall chain visibly warps mid-draw because scale/pan shift
   after each click. Reproduced twice with fresh bounding-box reads per
   click (not a test artifact).
2. `File > Save` and `File > Open` are `alert('...not implemented yet')`
   stubs (`main.ts:163-164`); `Edit > Select All` is also a stub
   (`main.ts:174`) and Ctrl+A falls through to native browser text-select
   instead. A design app that cannot save/load a project is not usable.
3. The 3D viewport renders a blank uniform-gray frame on a brand-new empty
   home (no ground plane, horizon, or grid), and renders drawn walls as
   flat unlit color shards with no recognizable geometry from the default
   camera. Confirmed with 0 console errors, so it's a scene/camera/lighting
   logic bug, not a crash.
4. Room, Dimension, and Text tools are `disabled` in the DOM with
   `title="... — coming soon"` (`main.ts:201-203`) despite U3's DoD
   ("all tools selectable") being marked `done`.
5. `qa-loop/MISSING_FEATURES.md` + `qa_results.json` (2026-08-27 run):
   `add_door`/`add_window` are `UNKNOWN_COMMAND` — doors/windows exist as
   catalog items (21 "Doors" category pieces incl. windows) but placing one
   does not cut a wall opening.
6. No level/floor management UI exists, though the wall properties panel
   already has a `Level: (none)` field, implying the model supports it.
7. Furniture catalog sidebar is a fixed ~240px column; item names/dims
   truncate (e.g. "Chest", "Round table", "Washbasin" all clipped).
8. No CI — verification is manual/self-reported per ticket, which is how
   finding 4 shipped as `done`. For a "fully agent-maintainable" app, every
   push should get an automatic lint/typecheck/test/e2e signal.

**Coordination note (2026-08-28, added by manager mid-run):** a second,
independently-running `opencode` engineering-manager loop (server on
:4096, predates this track — branch/baseline commits show it was set up
before Track M existed) was already working overlapping ground via its own
git worktrees: `wt-renderer` (`fix/renderer-yaw`), `wt-furniture`
(`fix/furniture-render`), `wt-doors` (`fix/doors-windows`), `wt-lint`
(`fix/lint-config`). Per user decision: **do not duplicate that work,
verify then adopt it.**

**Update:** the user stopped that other loop. Manager took over its
worktrees directly:
- `wt-furniture`/`fix/furniture-render` — had 2 commits + a real,
  uncommitted, verified-working fix (yaw sign bug) sitting in the working
  tree when stopped. Manager verified all of it (161/161 vitest, tsc/eslint
  clean) and merged into `main` (merge commit, message has details). This
  fixed the 2 pre-existing `view3d.test.ts` yaw failures every prior M1/M3/
  M7/M10 report mentioned as "unrelated, owned by wt-renderer/M2" — full
  suite is 173/173 clean now. Also landed: GLTF furniture caching fix
  (models no longer stuck as gray boxes), an eslint config fix (folds into
  M10/wt-lint's territory, harmless), new `furniture_place.yaml` qa-loop
  scenario.
- `wt-renderer`/`fix/renderer-yaw` — never actually started (still at
  baseline) before the loop was stopped; superseded by the above merge.
  Worktree left in place but its intended fix is already done.
- `wt-doors`/`fix/doors-windows` — never started (still at baseline). M5
  is un-reassigned back to "dispatch to opencode" — manager will delegate
  it directly now, reusing this worktree isn't necessary.
- `wt-lint`/`fix/lint-config` — never started (still at baseline). Lint is
  still red (~3958 errors per M10's baseline run, likely a config-scoping
  bug linting generated/vendored dirs, not 3958 real issues). Manager will
  delegate this directly as a new ticket (M12) rather than reuse the idle
  worktree.
- **M2 is NOT fully closed**: the yaw + GLTF-caching fixes landed, but the
  original audit's other finding — an empty home's 3D view renders a
  completely blank uniform-gray frame, no ground plane/horizon — is still
  reproducible after the merge (re-verified live). M2's remaining scope is
  narrowed to just that: ground plane + lighting/background for the
  default/empty scene. Re-opened as `todo`, dispatched directly (view3d/ has
  no file overlap with M4's in-flight plan/core work, safe to run
  concurrently).

| Ticket | Title | Deps | Owner dir | Track | Claimed-by | Status | Notes |
|--------|-------|------|-----------|-------|------------|--------|-------|
| M1 | core-interactions-fix | U6 | homely/src/main.ts + homely/src/plan/renderer.ts + homely/src/services/adapters | opencode:glm-5.2 | opencode:glm-5.2 | done | 025cfed. Manager-verified: tsc clean (1 unrelated pre-existing error in M7's in-flight catalog-panel.ts), eslint clean, vitest 164/166 (2 pre-existing view3d yaw failures owned by wt-renderer, unchanged), 5 new tests pass. Live Playwright re-test confirms the wall-drawing fix: zoom stays 100% through a 4-click rectangle (was jumping to 240% and distorting the shape pre-fix). Save/Open and Select All wired per spec below. P0. (a) Stop `fitToBounds` from re-running every render frame — only fit on initial load / explicit "Fit" click / window resize, never mid-draw. (b) Wire File>Save + File>Open to real persistence: complete `services/adapters/tauri-fs.ts`, use Tauri's fs plugin under `tauri dev`/build and a browser download/`<input type=file>` fallback under plain `vite dev`, serializing via the existing NormalizedHomeState schema. (c) Wire Edit>Select All (menu + Ctrl+A) to select every item in the current level via the store, not a browser default. DoD: e2e test draws a 4-wall rectangle via 4 raw clicks with no explicit zoom action and asserts the resulting wall graph is a rectangle (right angles, expected lengths); e2e/unit round-trips Save→Open and the model matches; Select All selects N objects and properties panel reflects it. `npm run e2e` + `npm test` green. |
| M2 | 3d-viewport-rendering | U4 | homely/src/view3d | opencode:glm-5.2→mimo-v2.5-free→manager | manager | done | 5073b14. Both opencode attempts made zero progress (usage limit, then a silent stall); manager implemented directly — root cause was `setActivePreset`'s OrbitControls recenter-to-bounds-center collapsing pitch to ~-67° for the empty-home fallback box. Manager-verified: tsc/eslint clean, vitest 193/193, e2e/viewport3d.spec.ts 12/12 (updated empty-viewport baseline), live Playwright checks of empty+populated scenes in both camera presets. P0. **Un-reassigned, dispatched directly** (see coordination note above) — yaw + GLTF-caching sub-issues already fixed via merged `fix/furniture-render`. **Remaining scope, narrowed**: an empty home's 3D view still renders a completely blank uniform-gray frame (re-verified live post-merge) — no ground plane, no horizon/sky. Add a visible ground plane + horizon/sky (or gradient background) for an empty home; confirm ambient+directional lighting differentiates wall faces now that yaw is fixed (re-check whether this is still an issue post-merge — may already be adequate, verify before doing extra work). DoD: new Playwright screenshot assertion — empty-home 3D screenshot has >1 distinct color region (not solid gray). Update `e2e/viewport3d.spec.ts` baselines. |
| M3 | room-tool | M1 | homely/src/plan + homely/src/core | opencode:glm-5.2 | opencode:glm-5.2 | done | c2d85cb. Manager-verified: tsc/eslint clean, vitest 171/173 (2 pre-existing yaw failures unchanged, 7 new pass). Live Playwright re-test: drew 4 walls, used Room tool to close a polygon inside → floor fill + "6.29 m²" area label + Room properties panel (Name/Area/Perimeter/Floor/Floor Color) all render correctly; Ctrl+Z removes only the room, walls remain selected (4 objects). Manual click-polygon variant, not auto-loop-detect (per ticket's explicit stretch-goal carve-out). 3D floor rendering not independently verified (3D viewport itself is still broken, owned by wt-renderer/M2). P1. Implement the Room tool per `IMPROVEMENT_PLAN.md` §1 (or a simpler click-polygon variant if auto-loop-detection is too large for one ticket — auto-detect is a stretch goal, not required for DoD): user can create a room/floor polygon, it renders with floor fill + centered m² area label in plan and floor+ceiling in 3D, undoable. Remove `disabled` + `data-tool="room"` stub. DoD: e2e draws 4 walls + creates a room from that loop, asserts area label present and 3D shows a floor plane; undo removes it. |
| M4 | dimension-and-label-tools | M1 | homely/src/plan + homely/src/core | opencode:kimi-k2.7-code | | done | Verified 2026-08-29: commit 0622955 (board row had been left stale after implementation landed). Dimension-line + label tools implemented in engine.ts/renderer.ts, toolbar buttons enabled. Manager fixed a compound-edit bug directly (worker had placement + selection as two separate store.apply() calls instead of one, breaking single-undo-step). 8 tests in plan-engine.test.ts including single-undo-step assertions for both tools. Re-ran: 35/35 tests pass in tests/plan-engine.test.ts. P1. Implement Dimension-line tool (click two points, shows length, editable) and Text/label tool (click to place editable text) — basic SH3D parity, not full feature set. Remove their `disabled` stubs. DoD: e2e places one dimension line and one label; both persist through undo/redo and through M1's save/open round-trip. |
| M5 | doors-and-windows | M1,M3 | homely/src/plan + homely/src/core + homely/src/view3d | opencode:mimo-v2.5-free | opencode+manager | done | 3b1ab57. Manager-verified: tsc/eslint clean, vitest 190/190, qa-loop full suite 0 bugs/0 missing (was 2 UNKNOWN_COMMAND), pytest 102/102. Simplification: wall-attachment (wallRef/wallOffset) + automation commands only — no geometric wall-opening cutout (piece renders on the wall face, wall mesh not subtracted); documented as follow-up scope, not hidden. P1. **Un-reassigned, dispatched directly** (see coordination note above) — `wt-doors` was never actually started by the stopped loop. Dropping a door/window catalog piece (`eTeks#door`, `eTeks#window85x123`, etc., already in `catalog.json`) onto a wall must cut/reserve an opening in that wall (SH3D "piece on wall" semantics) in both plan and 3D, and the piece must move/resize with the wall. Add automation commands so `qa-loop/scenarios/doors_windows.yaml` passes (currently `UNKNOWN_COMMAND` for `add_door`/`add_window` per `qa-loop/MISSING_FEATURES.md`). DoD: `cd qa-loop && python3 run.py doors_windows` (or equivalent) reports 0 errors; e2e places a door on a wall and the wall visibly shows a gap under it. |
| M6 | levels-ui | M1 | homely/src/main.ts + homely/src/core | opencode:mimo-v2.5-free | opencode+manager | done | badcc53. Manager-verified: tsc/eslint clean, vitest 193/193, live Playwright check of add-level/switch flow. Plan-view level-scoping only (walls/rooms/furniture/dims/labels + hitTest); 3D-view scoping not implemented, left as follow-up. P1. Add UI (menu or panel) to add/rename/switch/delete levels — the model already carries a per-wall `Level` field (seen as `(none)` in the properties panel) so this is UI + store wiring, not new model design. DoD: e2e adds a second level, switches to it, draws a wall, switches back to level 1, and asserts the level-1 wall count is unchanged (objects are level-scoped). |
| M7 | catalog-panel-polish | U7 | homely/src/ui/catalog-panel.ts + homely/src/style.css | opencode:kimi-k2.7-code | opencode:kimi-k2.7-code | done | b14a50a. Manager-verified: tsc/eslint clean, panel widened 240px→280px default (260px min) + resize handle + single-column wrap (no more ellipsis truncation); live screenshot confirms "Chest 100×55×80" etc. now fully visible. P2, independent — can run any time, no shared files with M1-M6. Fix the furniture sidebar so item names/dimensions never clip at ≥1280px window width (currently a fixed ~240px column truncates "Chest", "Round table", "Washbasin", etc.) — widen cards, wrap text, or make the panel resizable. DoD: Playwright screenshot of the catalog panel at 1280/1600/1920px widths shows no clipped label text (visual check + a DOM assertion that `scrollWidth <= clientWidth` on catalog item labels). |
| M8 | preferences-dialog | M1 | homely/src (new: ui/preferences) | opencode:mimo-v2.5-free | opencode:mimo-v2.5-free | done | 403bcf1. Manager-verified: tsc/eslint clean, vitest 205/205 (12 new), live Playwright check confirms the dialog opens from Edit menu with all 5 fields functional. Unit/language are documented stubs (stored, not wired to conversion/i18n), ground color live-wired to environment. P2. Add a Preferences dialog (unit cm/inch, default new-wall height/thickness, language stub, ground color) reachable from a menu, persisted (localStorage is fine), and new walls/rooms honor the changed defaults. DoD: change default wall height in prefs, draw a new wall, assert it uses the new height; reload the page and assert the pref persisted. |
| M9 | export-and-format-docs | M1 | homely/src/services/adapters + docs/ | opencode-go/glm-5.3 | opencode-go/glm-5.3 | done | b52cee3. Manager-verified: tsc/eslint clean, vitest 216/216, and live Playwright download check — clicking File>Export Plan as PNG produces a real 41.8KB PNG with a valid signature. docs/file-format.md correctly states own-JSON format + GPL non-porting rule. P2. Document (in `docs/`) that Homely's save format is its own NormalizedHomeState JSON, not SH3D's `.sh3d` binary format (GPL — never port SH3D's file-format code). Add a plan-view PNG export (File>Export or toolbar button) since SH3D's print/export is a headline feature and Homely currently has none. DoD: doc committed; export produces a valid, non-trivial PNG of the current plan. |
| M10 | ci-pipeline | — | .github/workflows + repo root | opencode:glm-5.2 | opencode:glm-5.2 | done | 89c5637. Manager-verified: re-ran `./scripts/verify-all.sh --skip-e2e` myself, matches reported output exactly (lint FAIL/3958 pre-existing errors = wt-lint territory, typecheck PASS, vitest 2 pre-existing yaw failures = wt-renderer territory, pytest PASS). GitHub Actions itself untestable — no git remote configured; script is the authoritative local gate per AGENTS.md. Note: 3958 lint errors is suspiciously high, likely a lint-config scoping bug (linting generated/vendored dirs) rather than 3958 real issues — flag for wt-lint. P3, agent-maintainability, no file overlap with anything else — run any time. **Narrowed** (see coordination note above): scaffold CI wiring only — do NOT touch eslint/prettier/tsconfig config files, `wt-lint`/`fix/lint-config` owns those. Add CI (GitHub Actions, or if no remote CI is available in this environment, a documented `./scripts/verify-all.sh` wired into a pre-push hook) running `homely`: lint + tsc + vitest + playwright e2e, and `equivalence`: pytest, on every push, using whatever lint config exists at merge time. This is the actual fix for how U3's "done" shipped with disabled tool stubs — automatic verification instead of self-reported ticket rows. DoD: workflow/script committed; a deliberately-broken change (e.g. reintroduce a `disabled` stub) is shown to fail it; documented in `AGENTS.md`. |
| M11 | qa-loop-coverage-expansion | M3,M4,M5,M6 | qa-loop/ | opencode:mimo-v2.5-free | opencode:mimo-v2.5-free | done | 0f1ef7b. Manager-verified: re-ran `qa-loop/run.py` independently, 7/7 scenarios OK, 0 bugs/0 missing features. Added room_tool_clicks.yaml, dimension_and_label_clicks.yaml, levels_second_level.yaml. Gap noted (not this ticket's fault): no `set_active_level` automation command exists, so end-to-end level-switching isn't qa-loop-testable yet — verified via `levelRef` param assignment instead. CI wiring already covered by M10. P3. Extend `qa-loop/scenarios/` to cover room/dimension/label/doors/levels once M3-M6 land, replacing today's 3-scenario/1-failing coverage; wire `qa-loop` into M10's CI. DoD: `qa-loop/run.py` covers all Track M features with 0 errors; runs in CI. |
| M12 | lint-config-cleanup | — | homely/eslint.config.js + homely/.eslintrc* + homely/prettier config | opencode:glm-5.2 | opencode:glm-5.2 | done | e88dd1d. Manager-verified: `./scripts/verify-all.sh --skip-e2e` all PASS (lint/typecheck/unit/pytest). Root cause was already half-fixed by the wt-furniture merge (9126cba added the missing `ignores` array, ~3958→7); this ticket's own fix was a `.mjs` globals config block for `shot.mjs` (7→0). Lint is fully green now. P3, was `wt-lint`/`fix/lint-config`, never started by the stopped loop — picked up fresh. `./scripts/verify-all.sh` (M10) reports ~3958 lint errors, which is implausibly high for a ~170-test, well-typed codebase — almost certainly a config-scoping bug (e.g. linting `dist/`, `node_modules/`, generated `assets/`, or `playwright-report/` instead of just `src/`/`tests/`/`e2e/`). Investigate and fix the eslint config scope; only then assess how many *real* lint errors remain and fix those too if the count is still non-trivial. DoD: `npm run lint` error count drops to a sane number (ideally 0, document any deliberately-kept warnings); `./scripts/verify-all.sh`'s lint step flips PASS. |
| M13 | furniture-placement-mode-stuck | M1 | homely/src/main.ts + homely/src/ui/catalog-panel.ts | opencode:mimo-v2.5-free | opencode:mimo-v2.5-free | done | e484d3b. Fix: disarm catalog on every toolbar tool-switch + auto-disarm after each successful placement (SH3D convention: place one, back to selection). Manager-verified: tsc/eslint clean, vitest 193/193, e2e/furniture-placement.spec.ts 8/8 (4 new M13 regression tests), and re-ran the exact original bug repro live — furniture count stays at 1, correct item selected, drag moves it correctly. P0, found by user live-testing furniture after M1-M12 landed — **root cause already diagnosed by the manager below, this ticket is implement-and-verify only, no further investigation needed.** After placing ONE catalog item via click-to-place, the catalog panel never disarms (`CatalogPanel.disarm()` is only called from the Escape-key handler in `main.ts` and once after a GLB import — never from the toolbar's tool-button click handler at `main.ts` around line 234-240, which only calls `engine.setTool(...)`). Result: every subsequent plan click — including clicking the Select tool button first, then clicking an existing piece meaning to select/drag it — is swallowed by the still-armed catalog placement path (`pointerup` handler's `catalogPanel?.isArmed()` branch) and silently places ANOTHER copy of the same item at that point instead of selecting anything. Confirmed via live Playwright repro: place a chair (1 furniture item) → switch to Select tool → click the chair again intending to select it → a SECOND overlapping chair is created (`furniture-2`) and selected instead of the original (`furniture-1`); the original is now permanently stuck as an unselectable, duplicate ghost item under it. This makes furniture practically unusable after the first placement — you can never select/move/delete a previously-placed piece without hitting Escape first, and most users won't know to. Fix: disarm the catalog panel (a) whenever `engine.setTool(...)` is called for any tool other than continuing to place (i.e. in the toolbar tool-button handler, and anywhere else `setTool` is invoked directly), and (b) reconsider whether placement should even stay armed after one successful placement by default (check what `catalog-panel.ts`'s own click-to-arm toggle logic at `place()`/`arm()`/`disarm()` around lines 107-280 intends — SH3D's own convention is single-placement-then-back-to-selection unless a "keep armed" modifier is used; match that unless a deliberate multi-place design is documented somewhere). DoD: live/e2e test — place one item, click Select tool (or just click elsewhere without re-arming), click the placed item, assert it's selected (not duplicated) and drag-moves correctly; furniture count stays at 1 throughout. Also verify: placing a SECOND, different item deliberately (re-clicking a catalog card first) still works normally. |
| M17 | automation-server-security-audit | — | homely/src/automation/ + homely-mcp/ | opencode-go/glm-5.3 | opencode-go/glm-5.3 | done | a732123. No vulnerability found — architecture is inverted from the ticket's assumption (Homely is a WS *client* that connects out; it never listens). Manager-verified: `client.ts:56` hardcodes `ws://127.0.0.1:` with no host-injection path; `equivalence/eq/adapters/server.py:76` defaults `host="127.0.0.1"`; new `src/automation/README.md` documents the trust model. eslint clean, README exists, server.py compiles. Documentation-only change, correctly scoped per the ticket's own "already safe" branch. P1, production-readiness. The plan/3D engine is remote-controllable over a WebSocket automation protocol (`homely/src/automation/`, driven externally by `qa-loop/` and `homely-mcp/server.py`). Audit whether this server binds to `127.0.0.1`/localhost only or to `0.0.0.0`/all interfaces, and whether it requires any authentication/token. If it's reachable from the network with zero auth, that's a real vulnerability for a shipped app (arbitrary remote state manipulation — draw/delete/export a user's home design, or worse if any command reaches the filesystem). Check `AutomationServer`/WS server setup (search for `listen`/`createServer`/host binding) in `homely/src/automation/` and `homely/src-tauri/` if the automation port is opened there. DoD: confirm+document the current binding (localhost-only is likely fine for a local design app and needs no fix, just documentation); if it's not localhost-only, restrict it to loopback by default with a clear opt-in for LAN access, and add a test asserting the bind address. Do not touch qa-loop/ scenario files (M11 owns those) even though they're a consumer of this server. |
| M18 | undo-redo-memory-and-scale | M1 | homely/src/core/store.ts | opencode-go/glm-5.3 | opencode-go/glm-5.3 | done | 7a79005. Clean bill of health, not a bug: undo history already capped at `MAX_UNDO_DEPTH=100` (oldest-dropped via `shift()`, store.ts:17,59,89) — manager spot-checked the source directly. Benchmark at 200 walls/500 furniture: 29ms total (500ms bound) for select-all+move+undo+redo+add. Manager-verified: vitest 208/208 (20/20 in store.test.ts scoped run), numbers match the worker's report exactly. Worker proactively caught and proved (via git stash) that a tsc error came from a concurrent ticket's in-flight file, not theirs — good practice. P2, production-readiness. Check whether the undo/redo history in `HomeStore` (`homely/src/core/store.ts`) grows unbounded over a long editing session (every wall/furniture/property edit pushes a full snapshot or diff forever) — a real design session could run for hours and accumulate thousands of edits. Also check whether core store operations (`getHome()`, `apply()`, selection/hit-test-adjacent paths) are doing anything O(n) or worse per-call that would visibly degrade on a home with, say, 200+ walls and 500+ furniture pieces (write a benchmark test that builds a home that size and times a representative sequence of operations — draw a wall, select-all, undo — before concluding whether there's a real problem). DoD: if undo history is unbounded, cap it at a sane number (e.g. 100-200 steps, matching common CAD-tool conventions) with a test proving old entries drop off; if a real perf cliff is found at the tested scale, fix or clearly document it as a known limitation with numbers (don't leave a vague "seems fine"). If everything already checks out at this scale, say so explicitly with the benchmark numbers — a clean bill of health is a valid, useful DoD outcome here. |
| M19 | import-robustness | M1 | homely/src/core/user-catalog.ts + homely/src/ui | opencode-go/glm-5.3 | opencode-go/glm-5.3 | done | 801703a (+ main.ts wiring landed via M9's b52cee3 — concurrent-edit note: both tickets touched main.ts and the worker flagged/handled the overlap correctly). Manager-verified: tsc/eslint clean, vitest 216/216, e2e/import-robustness.spec.ts 4/4 (text-as-glb, truncated, 512MB fast-reject, valid-import-still-works). 50MB cap + GLB magic-byte check before parse. P2, production-readiness. The "+ Import" feature (`homely/src/core/user-catalog.ts` and its UI hookup, lets a user import an arbitrary `.glb` file as a custom catalog item) is a user-supplied-file code path — audit its robustness. Check: what happens with a non-GLB file (wrong extension content, truncated/corrupt binary), an oversized file (no size cap?), or a GLB with degenerate/zero geometry — does any of these crash the app, hang it, or silently corrupt the catalog/store state, versus failing cleanly with a visible error message to the user? DoD: reproduce at least the corrupt-file and oversized-file cases with a live/e2e test, add validation (size cap + magic-byte/parse-error handling) so each fails with a clear, non-crashing error message instead of an unhandled exception or console-only failure; existing valid-GLB import flow must keep working (there should already be passing coverage for the happy path — don't regress it). |
| M20 | tauri-build-verification | U8 | homely/src-tauri/ + homely/package.json (scripts only) | tokenrouter/z-ai/glm-5.3-free | manager | done | No commit needed — the build already worked with zero source changes; worker's session was cut off before it could file a report, so the manager verified directly from the raw build output. `PATH="$HOME/.cargo/bin:$PATH" npm run tauri build` produces real AppImage/deb/rpm bundles (78MB AppImage). Confirmed furniture GLB paths (`/assets/models/*.glb`) embedded in the compiled binary via `strings`. Launched the AppImage on the sandbox's X display (`DISPLAY=:1`) — the `homely` process starts and stays alive (only a non-fatal missing-GStreamer-element warning, unrelated to core functionality); did not screenshot the window given time constraints, but process survival + asset embedding is solid evidence this is a real, working build, not just a green exit code. First time this project's actual desktop build has been verified at all. P1, production-readiness — this has never actually been verified end-to-end in this whole project's history; every ticket so far only ran `npm run dev` (plain Vite, no Tauri). "Production ready" for a Tauri app means the actual desktop build works, not just the dev server. Run `PATH="$HOME/.cargo/bin:$PATH" npm run tauri build` from `homely/` (per `AGENTS_STEWARD.md`'s note that cargo isn't on PATH in non-interactive shells) and see what happens — this may take several minutes and may fail; that's useful information either way. If it fails, diagnose and fix the build config (`homely/src-tauri/tauri.conf.json`, `Cargo.toml`, or the `prebuild`/`build` npm scripts) — do NOT weaken/remove verification steps (`assets:check`, `models:check` in `package.json`'s `prebuild` script) to make it pass; fix the actual cause. If it succeeds, verify the resulting binary/bundle actually launches and boots the app (headless is fine — use `xvfb-run` if there's no display, check `AGENTS_STEWARD.md`/CI notes for how prior Tauri-window verification was done in this repo) without console errors, and that bundled assets (catalog.json, textures, GLB models — per U8's asset pipeline) are actually present in the built bundle, not just in the dev `public`/`assets` source tree. DoD: `npm run tauri build` (with cargo on PATH) exits 0; the built app launches and shows the same shell (menu/toolbar/canvas) as `npm run dev` with no console errors; bundled furniture assets are confirmed present in the build output directory. If a full GUI launch genuinely can't be verified in this sandboxed environment (no display server at all, even via xvfb), say so explicitly and verify as much as is possible (build succeeds, bundle contents are correct) rather than silently skipping — this is the same "no GitHub Actions runner" honesty M10 already modeled, apply it here too. |
| M21 | wall-deletion-referential-integrity | M5 | homely/src/core/model.ts | opencode-go/glm-5.3 | opencode/mimo-v2.5-free | done | cb5dec9. Chose cascade-delete (door without its wall is meaningless, matches SH3D's parent-child mental model) over detach. Single undo step for wall+cascaded-furniture removal. Manager-verified: tsc clean, vitest 220/220 (24/24 in store.test.ts scoped). Caught a real discrepancy: commit claimed "eslint clean" but 3 unused-var errors existed in its own new tests — dispatched a follow-up lint-fix task rather than trusting the self-report. P2, production-readiness. M5 added `wallRef`/`wallOffset` on `Furniture` so doors/windows attach to a wall. Check what `HomeModel.removeWall()`/`removeItems()` (in `homely/src/core/model.ts`) does when the deleted wall has a door/window attached via `wallRef` — does the attached piece become an orphan with a dangling `wallRef` pointing at a now-nonexistent wall id, and if so, does anything downstream (plan renderer's `wallOutlinePoints` lookups, hit-test, the 3D scene builder) crash, throw, or render incorrectly when it encounters that dangling reference? Reproduce with a unit test: create a wall, attach a door via `addFurniture({wallRef: wall.id, ...})` or the `add_door` automation path, delete the wall, then call the normal render/export/hitTest paths and see what actually happens — don't assume. DoD: pick and implement ONE clean behavior (either cascade-delete the attached door/window when its wall is deleted, matching SH3D's own convention if you can determine it from `docs/behaviours/` or the reference source comments, or clear the piece's `wallRef`/`wallOffset` to null so it becomes a normal free-floating furniture item at its last position) — whichever is less surprising and simpler given the existing `removeWall`/`removeItems` structure. Add a test proving no crash, no dangling reference, and undo/redo correctness for whichever behavior you pick (deleting the wall then undoing should restore both the wall AND the door/window relationship exactly as it was). |
| M22 | properties-panel-input-validation | U5 | homely/src/ui/properties-panel.ts | opencode-go/glm-5.3 | | done | Verified 2026-08-29: commit c9e23f8. Wall xStart/yStart/xEnd/yEnd validated as finite floats (validateFinite); height/thickness require positive minimums (validatePositive, min 1 / 0.1). Furniture width/depth require positive minimums; angle passes through normalizeAngle() (reused from core/export.ts, not reinvented) on commit. Invalid input reverts the field instead of committing NaN/garbage. tests/properties-panel.test.ts added (11 tests). Independently re-ran: tsc --noEmit clean, eslint clean, full vitest suite 19 files / 231 tests passed. P2, production-readiness. The properties panel (`homely/src/ui/properties-panel.ts`, from U5) lets a user directly edit numeric fields — wall thickness/height/position, furniture width/depth/height/angle, room name, etc. Check what happens when a user types a negative number, zero, an empty string, non-numeric text, or an absurdly large value (e.g. 1e20) into these fields and commits it (blur/Enter) — does it crash, silently produce garbage/invisible geometry (e.g. a zero-thickness wall, negative furniture dimensions that invert normals), or does it already clamp/reject cleanly? Reproduce live/in a test for at least: wall thickness, furniture width, and one angle field. DoD: add reasonable validation per field type — numeric fields reject non-numeric input (revert to the last valid value or clamp, your call, but never let `NaN`/negative-where-invalid reach the model), dimension fields (thickness/width/height/depth) get a sane minimum (e.g. 0.1cm, not zero or negative), angle fields wrap or clamp to a sane range if the model expects one (check what `angleDeg` normalization, if any, already exists elsewhere in the codebase — e.g. `normalizeAngle` in model.ts — and reuse it rather than inventing new rounding rules). Add tests proving invalid input never reaches `model.update*()` calls with a value that would break rendering (e.g. assert a wall's thickness never goes to 0 or negative via the panel). Don't touch unrelated fields/behavior in the panel. |
| M23 | save-open-roundtrip-fuzzing | M1 | homely/src/services/adapters/home-persistence.ts + homely/tests | opencode-go/mimo-v2.5 | | done | Verified 2026-08-29: commits 452c0cd (tests) + e51be056-fix folded in. 23 round-trip tests (multi-level/levelRef, wallRef/wallOffset doors/windows, unicode, boundary numbers, camera/compass rounding) + 9 malformed-JSON failure-path tests. No data-loss bugs found. Manager-verified: tsc clean, eslint clean (after catching+fixing 2 unused-import errors from the worker's own new test file), full vitest 20 files/257 tests pass. Note: originally dispatched on tokenrouter/z-ai/glm-5.3-free, which wedged after hitting an undocumented 8-req/min rate limit shared across concurrent sessions — cancelled (no lost work) and relaunched on opencode-go/mimo-v2.5. P2, production-readiness. M1 wired File>Save/Open to `home-persistence.ts` (JSON round-trip via `serializeHome`/`isNormalizedHome`). Strengthen confidence in this being lossless and crash-proof for realistic, varied states — not just the simple case M1's own tests covered. Build several distinct home states programmatically via `HomeModel` (one with multiple levels + objects on each via `levelRef`, one with a room + dimension lines + labels + a door/window with `wallRef`/`wallOffset`, one that's completely empty, one with unicode/special characters in names like room/label text) and for each: serialize via `saveHomeFile`'s underlying serialization function (check `home-persistence.ts` for the exact exported function names — you may need to export an internal one for direct testing rather than only the browser-download-wrapped version), parse it back, and assert deep equality against the original (modulo intentional rounding, if any — check `core/export.ts`'s `roundLen`/`roundAngle` usage and account for that tolerance in your assertions, don't just require exact float equality). Also test the failure path: parsing deliberately malformed/truncated JSON should fail with a clear error, not throw an unhandled exception or silently return a corrupt/partial home. DoD: a test file with these round-trip cases, all passing; if you find ANY case where round-tripping loses or corrupts data (not just expected rounding), fix the serialization/parsing to close the gap — don't just document data loss as acceptable unless you have a specific reason tied to the existing rounding contract in `core/export.ts`. |
| M24 | level-deletion-referential-integrity | M21 | homely/src/core/model.ts | opencode-go/deepseek-v4-pro | | done | Verified 2026-08-29: commit 18da0ea. Found `removeLevel` already existed (M6) but only detached content (nulled levelRef), leaking it into the default/null level instead of removing it. Now cascade-deletes level + all scoped walls/rooms/furniture/dimensionLines/labels in one `store.apply()` (single undo step, mirrors M21's `removeWall` pattern exactly); `removeItems` gets the same cascade when a level id is in the delete set. 4 new tests in store.test.ts. Manager-verified: tsc clean, eslint clean, full vitest 20 files/257 tests pass. Note: also originally on tokenrouter/z-ai/glm-5.3-free, hit the same 8-req/min wedge, relaunched on opencode-go/deepseek-v4-pro (no lost work). P2, production-readiness — same bug class as M21 (read M21's commit `cb5dec9` first for the exact pattern to mirror), applied to levels instead of walls. Check what `HomeModel`'s level-removal method (find it — likely `removeLevel`) does when the deleted level still has walls/rooms/furniture/dimensionLines/labels scoped to it via `levelRef`. Does it cascade-delete that content, leave it as dangling-`levelRef` orphans (invisible forever since M6's level-scoping filters by a now-nonexistent level id, or visible-forever if the "All" filter is used — check both), or does removing a level even exist as an operation yet at all (it might not — if there's no `removeLevel` method, that's a legitimate finding: say so and add one, since M6 added level *creation* but may not have added removal). Reproduce with a unit test: create a level, add a wall/room/furniture to it via `levelRef`, remove the level, inspect the resulting state. DoD: pick ONE clean behavior — cascade-delete (removes the level and everything scoped to it, mirroring M21's reasoning) is almost certainly correct here too (a level's contents are meaningless without the level, more so than a single wall's door) — implement it if not already present, in one compound/single-undo-step edit like M21's pattern. Add tests proving no dangling `levelRef` after removal, and correct undo/redo (removing a level then undoing restores the level AND everything that was cascade-deleted with it). |
| M25 | threejs-resource-disposal-audit | B4 | homely/src/render + homely/src/view3d | opencode-go/qwen3.7-plus | | done | Verified 2026-08-29: commit 94632be. Found a real leak: `disposeSceneObjects()` gated on `mesh.isMesh`, so THREE.LineSegments/Line objects (wall-edge outlines, dimension lines) were skipped entirely on rebuild/dispose. Fixed to dispose any traversed object with a `.geometry`, still excluding `userData.shared` GLTF-cached resources. 4 new tests (dispose-on-rebuild, LineSegments-specifically, shared-exclusion, add/remove-cycle baseline). Manager-verified: tsc clean, eslint clean, full vitest 22 files/270 tests pass. Also hit the tokenrouter 8-req/min wedge, relaunched on opencode-go/qwen3.7-plus (no lost work). P2, production-readiness. Three.js does NOT garbage-collect GPU resources (geometries/materials/textures) when objects are removed from the scene graph — only `.dispose()` calls free them. A long editing session (add/remove furniture and walls repeatedly, switch levels, undo/redo) can leak GPU memory indefinitely if disposal is missing anywhere. Audit every place in `homely/src/render/` and `homely/src/view3d/` where a mesh/geometry/material/texture is removed or replaced (furniture removal, wall removal/rebuild on edit, level switching, GLB model swap, texture-cache eviction if any — check `src/render/__tests__/texture-cache.test.ts` and its implementation for what it already covers). For each removal path, confirm `.geometry.dispose()`, `.material.dispose()` (and any textures on the material — `map`, `normalMap`, etc.) are actually called, not just `scene.remove(object)` (which only unlinks it, it does not free GPU memory). Reproduce the leak if present: a test or scripted repro that adds+removes N furniture items repeatedly and counts live geometries/materials (Three.js's `renderer.info.memory` counters are the standard way to check this) before/after — the count should return to baseline, not grow unboundedly. DoD: fix every disposal gap found (don't touch rendering logic beyond adding the missing dispose calls), add a test using `renderer.info.memory.geometries`/`.textures` (or equivalent) proving counts return to baseline after add/remove cycles, don't add disposal calls for objects that are still referenced elsewhere (e.g. don't dispose a shared/cached texture that other live meshes still use — check the texture-cache's ref-counting if it has one before touching it). If the audit finds no real gaps, say so explicitly with the evidence (the memory-counter test itself is still useful to add either way, as a regression guard). |
| M26 | unsaved-changes-guard-on-close | M1 | homely/src/main.ts + homely/src/services/adapters/home-persistence.ts | tokenrouter/z-ai/glm-5.3-free | | todo | P2, production-readiness. Confirmed gap: grepping `homely/src/` for `beforeunload`/`unsaved`/`isDirty`/`dirty` returns nothing — there is currently NO dirty-state tracking and NO warning before data loss. Classic desktop-app expectation (SH3D itself has this): if the user has unsaved changes and closes the window, opens a different file, or starts a new home, they should be warned and given the chance to cancel/save first, not silently lose work. Implement dirty-state tracking: mark the home "dirty" on any model-mutating store action after the last save/load (check how `core/store.ts` exposes change notifications — likely already has a subscribe/observer mechanism per `view3d/watch.ts`'s `observeStore` — reuse it, don't build a parallel notification path), and clear dirty on successful save (`File > Save`) or load (`File > Open`, `File > New`). Wire a native `beforeunload` handler (Tauri apps still run in a webview, `window.addEventListener('beforeunload', ...)` works for the browser-close case; check if Tauri's window API has its own close-request event that needs separate handling — `@tauri-apps/api/window`'s `onCloseRequested` if the crate is already a dependency, otherwise the standard web `beforeunload` is an acceptable MVP) that warns when dirty. Also gate `File > New` and `File > Open` behind the same check (a confirm dialog is fine, doesn't need to be fancy) when dirty. DoD: a test proving the dirty flag flips true after a mutation and false after save/load; if a manual/e2e check of the actual close-warning is impractical in a headless sandbox, say so explicitly and verify what you can (the dirty-tracking logic itself, unit-tested) rather than silently skipping. Don't add dirty-tracking overhead to hot paths (e.g. don't recompute a deep diff on every store change — a simple boolean flip on any mutating action is sufficient). |
| M27 | door-window-wall-opening-visual | M5 | homely/src/plan/renderer.ts + homely/src/render | opencode-go/glm-5.2 | | todo | P2, production-readiness. Confirmed gap via `qa-loop/MISSING_FEATURES.md` (already documented by the QA loop) and grep: `doorOrWindow` is a real field on `Furniture` (used in `src/main.ts`, `src/automation/homely-handler.ts`, `src/core/catalog.ts`, `src/core/catalog-service.ts`, `src/core/home.ts`, `src/core/model.ts`) but is referenced NOWHERE in `src/plan/renderer.ts` or `src/render/` — walls are drawn as solid rectangles/prisms regardless of attached doors/windows. A door or window currently just renders its own mesh on top of/inside a fully solid wall, which looks wrong (you can see the wall's surface through/behind a "window" that should be an actual hole) and doesn't match SH3D's real behavior of actually notching the wall opening. TASK: in the 2D plan renderer (`plan/renderer.ts`, wherever wall outlines are drawn — likely the same `wallOutlinePoints`/similar function M21's ticket referenced), for each wall, find furniture with `wallRef` pointing at it and `doorOrWindow: true`, and render a visible gap/notch in the wall's fill at that furniture's position + width along the wall (don't need real CSG boolean geometry — a simple "don't fill this segment of the wall polygon" or "draw a white/background-colored rectangle over that segment" is an acceptable MVP for the 2D case). For the 3D case (`src/render/`), decide based on what's actually feasible without a rabbit-hole: if true geometry subtraction (CSG) is too large a lift for this ticket, an acceptable MVP is cutting a real rectangular hole via multiple box segments (top lintel + two side segments instead of one solid wall box, leaving a gap where the opening is) rather than one solid box — this is a standard non-CSG technique. Do NOT attempt a full CSG library integration in this ticket if none is already a dependency — that's out of scope; ship the segmented-box MVP and document the CSG gap as a follow-up if you go that route. DoD: `npx tsc --noEmit` clean, `npx eslint` clean on touched files, `npx vitest run` all passing plus new tests asserting a wall with a door/window attached produces a different (gapped) geometry/outline than a wall with none — a geometry/vertex-count or outline-polygon-segment assertion is fine, doesn't need pixel-level rendering comparison. If you determine even the segmented-box MVP is too large for this ticket's scope, ship the 2D plan-view notch only and explicitly document in your report that the 3D wall-cutout remains a follow-up ticket — do not leave the ticket half-done with nothing committed. |

## Sequencing waves

```
W0  DONE (grace): D0 D1
W1  DONE: driver-dev:A1  clone-dev:B1  harness-dev:C1→C2(mock)
W2  DONE: A2→A3‖A4  B2→B3‖B4,B5  C3‖C4
S1  DONE: A4+B5 landed → C5 unblocked
W3  DONE: E2E integration + B6-B9, C7-C9, D2-D3
W4  UI phase 1 parallel: clone-dev: U1 (layout shell) → then U2‖U3 (plan enhance + toolbar) → then U4‖U5 (3d polish + properties)
W5  Furniture: driver-dev: A5 (catalog over wire) → clone-dev: U7 (catalog UI, needs U3/U2) → U8 (asset pipeline + bundling, needs U7)
W6  Modernization (opencode-delegated, manager-verified): M1‖M2 (disjoint dirs)
    → M3‖M4‖M6 (all depend on M1, disjoint dirs from each other) ‖ M7‖M10 (fully independent, run anytime)
    → M5 (needs M1+M3, hardest — frontier model) → M8‖M9 → M11
```

## Board rules

1. One ticket in flight per agent at a time.
2. Next ticket = any `todo` row whose deps are all `done` AND whose track
   matches yours. Pick in dep order within your track.
3. Never edit outside your owner dir (exceptions: your own board row,
   append-only additions under `docs/behaviours/`).
4. Contract change needed? Set your row to `blocked`, note it, stop. The
   integrator resolves contract changes — never fork the schema/protocol.
5. Commit style: `<track>: <what>` where track ∈ {driver, clone, harness,
   board, docs}. Small commits.
6. Every ticket has DoD + verification below. Run verification BEFORE setting
   `review`.

## Steward lifecycle per ticket

```
claim_work(<ticket-id>)            # matches board row
lock_file(file)                    # before EVERY file edit, unlock after commit
implement → verify                 # commands from this file
save_memory / skill_save           # durable learnings before release
board row → review, commit         # "driver: A1 done ..." etc
release_work                       # then submit_task_feedback LAST
```

Agent identities: use exactly `driver-dev`, `clone-dev`, `harness-dev`,
`naharemete_Grace` (integrator) as agent_id.

---

## Tickets — Definition of Done & Verification

### Track D (integrator)

- **D0 repo-init** — git init, .gitignore, AGENTS_STEWARD.md, directory
  skeleton, python venv, rust toolchain. Verify: `git log --oneline` non-empty;
  `.venv/bin/python --version`; `cargo --version`.
- **D1 contracts** — schema + protocol + architecture map written, saved to
  Steward, all 16 tasks created in Steward. Verify: files exist; steward
  `list_tasks` shows them.
- **D2 golden-and-slice** (after S1) — vertical slice scenario YAMLs under
  `equivalence/scenarios/slice/`; golden .sh3d projects generated by driver +
  committed expected-state JSONs. DoD: `./test-equivalence slice/create_room`
  runs end-to-end both apps.
- **D3 docs-matrix** (final) — `equivalence/matrix/features.yaml` seeded from
  scenario inventory; agent handbook; behaviour-notes template.

### Track A — sh3d-driver (Java 21, links build/SweetHome3D.jar + lib/*.jar)

- **A1 driver-boot** — main class boots real SH3D UI (SwingViewFactory,
  EventQueue), opens TCP server on $DRIVER_PORT implementing framing +
  hello/ping/new_home/get_capabilities. DoD: `python -m eq.adapters.sh3d
  --smoke` round-trips ping+new_home (or equivalent manual nc test); app
  window visible on DISPLAY. Verify documented in ticket README.
- **A2 driver-interact** — select_tool/click/move_mouse/release via
  PlanController cm API; key escape/delete; set_magnetism;
  undo/redo/delete_selection/copy/paste/select_all/clear_selection/
  modify_selected via ActionType action map. DoD: scripted sequence creates
  4-wall room, screenshot shows it, get_state returns walls.
- **A3 driver-state** — walk Home → NormalizedHomeState JSON conforming to
  schema (validate with python jsonschema in CI). Rounding: 3 decimals,
  angles deg. DoD: exported state of scripted room validates + wall count/
  coords match clicks.
- **A4 driver-capture-io** — offscreen plan+3d BufferedImage renders at
  requested size (no chrome); save/open .sh3d via DefaultHomeOutputStream.
  DoD: PNG bytes deterministic across two identical calls; save→open→get_state
  is stable.
- **A5 furniture-catalog-driver** — expose SH3D's real furniture catalog:
  `list_catalog` returns `{catalogId,name,width,depth,height,doorOrWindow}`
  (ws-protocol.md:80), and `add_furniture {catalogId,x,y,angleDeg?}`
  (ws-protocol.md:79) resolves dims via SH3D's catalog instead of inline
  params. DoD: `list_catalog` returns non-empty SH3D catalog; placing a
  catalog piece yields a state export matching the schema with
  catalogId set; equivalence scenario `furniture_place` added.

### Track B — Homely (Tauri v2 + Vite + TS + Three.js)

- **B1 homely-scaffold** — tauri init, vite, tsconfig strict, eslint/prettier,
  storage interface + tauri-fs adapter stub, automation client that connects
  out to HOMELY_AUTOMATION_PORT and answers hello/ping/new_home/get_state
  (empty home). DoD: `npm run tauri dev` shows window; orchestrator mock
  server completes handshake. Verify: documented smoke script.
- **B2 homely-core** — full model store per schema (walls/rooms/furniture/
  levels/cameras/environment/selection), command layer, undo/redo with
  capabilities flags, state export validating against schema. DoD: unit tests
  (vitest) cover undo/redo round-trip + export validates jsonschema fixture.
- **B3 plan-view** — canvas renderer + wall tool state machine matching
  PlanController semantics: chaining, double-click ends chain, escape cancels,
  magnetism snap (explicit flag), click-to-select, drag-move, room
  auto-detection on closed loop. DoD: same click script produces same wall
  graph as A2's export modulo ids.
- **B4 view3d** — Three.js scene from store; defaults FOV 63°, top camera
  z=1010 pitch 45°, observer eye 170 yaw 315 pitch 11.25; live sync on store
  changes. DoD: visual smoke render matches expected simple geometry.
- **B5 homely-capture** — offscreen WebGLRenderTarget plan(ortho)+3d(persp)
  renders → base64 png over automation; determinism constraints honored.
  DoD: two consecutive screenshots byte-identical (or pixel-equal).

### Track C — Harness (Python 3.12, pydantic/websockets/pyyaml/numpy/pillow/jsonschema)

- **C1 dsl** — YAML scenario schema + loader + validation errors that name the
  offending step. DoD: pytest suite incl. invalid-scenario cases.
- **C2 orchestrator** — WS server, adapter registry (sh3d/homely/mock),
  lockstep step executor, checkpoint snapshots, creation-order ledger emit.
  MockAdapter implements protocol in-process. DoD: demo run executes sample
  YAML against two mocks producing artifacts dir.
- **C3 comparators** — state deep-diff (tolerances pos 0.01cm angle 0.05deg
  color exact; ledger-based object matching) + geometry metrics. DoD: pytest
  fixtures covering pass/fail/tolerance-edge cases; failure records carry
  path/expected/actual/delta/objectId.
- **C4 reporting-cli** — results/<run-id>/ tree (summary.json report.md
  per-scenario states/screenshots/actions.json errors.json);
  `./test-equivalence <scenario> [--level N] [--target os,mode]`.
  DoD: running failing scenario yields summary.json pinpointing exact diff
  without human inspection.
- **C5 visual-diff** — Pillow compare + heatmap diff.png, per-region crops
  (region config per platform-mode), thresholds configurable per scenario.
  DoD: known-different pair produces score + heatmap; threshold breach flips
  overall verdict.

### Track U — UI (Tauri + HTML/CSS/TS + Three.js)

- **U1 ui-layout-shell** (after B9) — SH3D-style split layout: menu bar with
  File/Edit/View dropdowns, toolbar row below menu, side-by-side plan canvas +
  3D container (resizable divider), status bar at bottom. CSS grid layout,
  responsive. Dark theme option via prefers-color-scheme + toggle. DoD:
  `npm run tauri dev` shows split panel layout; plan canvas and 3D view both
  render; window resizes gracefully; dark mode toggle works.
- **U2 ui-plan-enhance** (after U1) — Plan view: major/minor grid lines
  (10cm/100cm), walls rendered as filled thick shapes (not stroked centerlines)
  with proper join corners, room floor fills with centered area labels (m²),
  selection handles (blue outline + corner dots for furniture), scroll-wheel
  zoom-to-fit, middle-click or Space+drag pan. DoD: visual comparison with
  SH3D plan view shows comparable level of detail; zoom/pan smooth; walls
  show thickness correctly at all zoom levels.
- **U3 ui-toolbar-tools** (after U1) — Full toolbar: icon buttons for
  selection/wall/room/dimension/text tools, undo/redo, camera preset toggle
  (plan/3d split or 3d-only), magnetism checkbox. Keyboard shortcuts shown in
  tooltips. Active tool highlighted. DoD: all tools selectable; undo/redo
  buttons reflect engine state; keyboard shortcuts work (Ctrl+Z/Ctrl+Y).
- **U4 ui-3d-polish** (after U1) — 3D view: wall left/right side colors,
  room floor + ceiling planes, shadow mapping (directional light), ground
  plane with grid, OrbitControls (orbit/pan/zoom), distance fog, ambient
  occlusion approximation via hemisphere light. DoD: 3D view looks comparable
  to SH3D's 3D view; orbit/pan/zoom functional; shadows visible.
- **U5 ui-properties** (after U2,U3) — Properties panel: right sidebar showing
  selected object properties (wall: start/end coords, thickness, height, color;
  room: area, perimeter, floor visible; furniture: name, position, dimensions,
  angle, color). Live updates on selection change. Editable fields update
  model. DoD: select a wall → see its properties; edit thickness → wall
  updates in plan + 3D view.
- **U6 wall-vertex-edit** (after U1) — SH3D-style wall vertex interaction:
  hitTest returns HitResult with endpoint priority, drag endpoint handles
  reshapes the wall + connected chain (shared vertex), renderer draws endpoint
  squares on selected walls, cursor management. DoD: dragging a shared endpoint
  moves both connected walls' vertex; cursor changes over handles; matches
  SH3D vertex-drag behaviour.
- **U7 furniture-catalog-ui** (after U3,U2) — Furniture catalog browser (left
  panel, SH3D-style): category list, search, thumbnail grid, click-to-place in
  plan view. Backed by `list_catalog` (ws-protocol.md:80) over the automation
  port, or a bundled catalog manifest. Click places a furniture piece via
  `addFurniture` with dims resolved from the catalog entry; selection /
  move / delete work on placed pieces. DoD: pick a sofa from catalog → click
  in plan → piece appears in plan + 3D with correct dims; undo/redo works;
  placed piece selectable + movable + deletable.
- **U8 furniture-assets-pipeline** (after U7) — Asset pipeline + bundling:
  commit generated textures (homely/assets/textures/ via generate.py) and add
  a `npm run assets` script that regenerates/validates them; add furniture 3D
  model assets (OBJ/GLB) + catalog manifest (licensed, not SH3D-sourced);
  configure Vite to copy `assets/` into dist and Tauri to bundle it; renderer
  loads real models instead of BoxGeometry. DoD: `npm run assets` regenerates
  textures deterministically; `npm run tauri build` bundles assets; 3D view
  renders furniture models, plan view renders catalog thumbnails; no network
  fetch at runtime.

---

## Kickoff prompts (paste into each agent terminal)

### driver-dev
```
You are driver-dev, Track A owner for the Homely project.
Working dir: /home/nahar/Documents/code/house_designer (shared checkout, branch main).
1. Read PLAN.md completely (board rules, sequencing, your Track A tickets).
2. Read docs/architecture-map.md and docs/specs/ws-protocol.md — these are frozen contracts.
3. Steward: get_started, then claim_work("a1-driver-boot") after marking your
   board row claimed (edit only your row; commit "board: claim A1").
4. lock_file every file before editing. Stay inside equivalence/driver-java/.
5. Build to the ticket DoD; run its verification; save learnings via
   save_memory/skill_save; flip row to review; commit "driver: A1 ...";
   release_work; submit_task_feedback last. Then pick your next todo ticket.
Never touch files outside your owner dir. Contract problems -> mark blocked.
```

### clone-dev
```
You are clone-dev, Track B owner for the Homely project.
Working dir: /home/nahar/Documents/code/house_designer (shared checkout, branch main).
1. Read PLAN.md completely (board rules, sequencing, your Track B tickets).
2. Read docs/architecture-map.md, docs/specs/ws-protocol.md,
   docs/schema/home-project.schema.json — frozen contracts.
3. Steward: get_started, then claim_work("b1-homely-scaffold") after marking
   your board row claimed (commit "board: claim B1").
4. lock_file every file before editing. Stay inside homely/.
5. Build to the ticket DoD; verify; save learnings; row->review;
   commit "clone: B1 ..."; release_work; submit_task_feedback last.
   Then pick next todo Track B ticket.
Never edit outside homely/. GPL: NEVER import sweethome3d code or assets.
Contract problems -> mark blocked.
```

### harness-dev
```
You are harness-dev, Track C owner for the Homely project.
Working dir: /home/nahar/Documents/code/house_designer (shared checkout, branch main).
1. Read PLAN.md completely (board rules, sequencing, your Track C tickets).
2. Read docs/specs/ws-protocol.md and docs/architecture-map.md sections 3-5.
3. Steward: get_started, then claim_work("c1-dsl") after marking your board
   row claimed (commit "board: claim C1").
4. lock_file every file before editing. Stay inside equivalence/eq/,
   equivalence/scenarios/, and ./test-equivalence.
5. You are NOT blocked by Tracks A/B: develop against adapters/mock.py.
   Build to ticket DoD; verify with pytest; save learnings; row->review;
   commit "harness: C1 ..."; release_work; submit_task_feedback last.
   Then pick next todo Track C ticket (order C1,C2,C3/C4 parallel-safe,C5 later).
Never touch driver-java/ or homely/. Contract problems -> mark blocked.
```

### integrator (grace) — reference
Runs W0/W3/W4, reviews `review` rows, owns contracts and merges.
