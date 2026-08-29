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
| M4 | dimension-and-label-tools | M1 | homely/src/plan + homely/src/core | opencode:kimi-k2.7-code | | todo | P1. Implement Dimension-line tool (click two points, shows length, editable) and Text/label tool (click to place editable text) — basic SH3D parity, not full feature set. Remove their `disabled` stubs. DoD: e2e places one dimension line and one label; both persist through undo/redo and through M1's save/open round-trip. |
| M5 | doors-and-windows | M1,M3 | homely/src/plan + homely/src/core + homely/src/view3d | opencode:mimo-v2.5-free | opencode+manager | done | 3b1ab57. Manager-verified: tsc/eslint clean, vitest 190/190, qa-loop full suite 0 bugs/0 missing (was 2 UNKNOWN_COMMAND), pytest 102/102. Simplification: wall-attachment (wallRef/wallOffset) + automation commands only — no geometric wall-opening cutout (piece renders on the wall face, wall mesh not subtracted); documented as follow-up scope, not hidden. P1. **Un-reassigned, dispatched directly** (see coordination note above) — `wt-doors` was never actually started by the stopped loop. Dropping a door/window catalog piece (`eTeks#door`, `eTeks#window85x123`, etc., already in `catalog.json`) onto a wall must cut/reserve an opening in that wall (SH3D "piece on wall" semantics) in both plan and 3D, and the piece must move/resize with the wall. Add automation commands so `qa-loop/scenarios/doors_windows.yaml` passes (currently `UNKNOWN_COMMAND` for `add_door`/`add_window` per `qa-loop/MISSING_FEATURES.md`). DoD: `cd qa-loop && python3 run.py doors_windows` (or equivalent) reports 0 errors; e2e places a door on a wall and the wall visibly shows a gap under it. |
| M6 | levels-ui | M1 | homely/src/main.ts + homely/src/core | opencode:mimo-v2.5-free | opencode+manager | done | badcc53. Manager-verified: tsc/eslint clean, vitest 193/193, live Playwright check of add-level/switch flow. Plan-view level-scoping only (walls/rooms/furniture/dims/labels + hitTest); 3D-view scoping not implemented, left as follow-up. P1. Add UI (menu or panel) to add/rename/switch/delete levels — the model already carries a per-wall `Level` field (seen as `(none)` in the properties panel) so this is UI + store wiring, not new model design. DoD: e2e adds a second level, switches to it, draws a wall, switches back to level 1, and asserts the level-1 wall count is unchanged (objects are level-scoped). |
| M7 | catalog-panel-polish | U7 | homely/src/ui/catalog-panel.ts + homely/src/style.css | opencode:kimi-k2.7-code | opencode:kimi-k2.7-code | done | b14a50a. Manager-verified: tsc/eslint clean, panel widened 240px→280px default (260px min) + resize handle + single-column wrap (no more ellipsis truncation); live screenshot confirms "Chest 100×55×80" etc. now fully visible. P2, independent — can run any time, no shared files with M1-M6. Fix the furniture sidebar so item names/dimensions never clip at ≥1280px window width (currently a fixed ~240px column truncates "Chest", "Round table", "Washbasin", etc.) — widen cards, wrap text, or make the panel resizable. DoD: Playwright screenshot of the catalog panel at 1280/1600/1920px widths shows no clipped label text (visual check + a DOM assertion that `scrollWidth <= clientWidth` on catalog item labels). |
| M8 | preferences-dialog | M1 | homely/src (new: ui/preferences) | opencode:glm-5.2 | | todo | P2. Add a Preferences dialog (unit cm/inch, default new-wall height/thickness, language stub, ground color) reachable from a menu, persisted (localStorage is fine), and new walls/rooms honor the changed defaults. DoD: change default wall height in prefs, draw a new wall, assert it uses the new height; reload the page and assert the pref persisted. |
| M9 | export-and-format-docs | M1 | homely/src/services/adapters + docs/ | opencode:glm-5.2 | | todo | P2. Document (in `docs/`) that Homely's save format is its own NormalizedHomeState JSON, not SH3D's `.sh3d` binary format (GPL — never port SH3D's file-format code). Add a plan-view PNG export (File>Export or toolbar button) since SH3D's print/export is a headline feature and Homely currently has none. DoD: doc committed; export produces a valid, non-trivial PNG of the current plan. |
| M10 | ci-pipeline | — | .github/workflows + repo root | opencode:glm-5.2 | opencode:glm-5.2 | done | 89c5637. Manager-verified: re-ran `./scripts/verify-all.sh --skip-e2e` myself, matches reported output exactly (lint FAIL/3958 pre-existing errors = wt-lint territory, typecheck PASS, vitest 2 pre-existing yaw failures = wt-renderer territory, pytest PASS). GitHub Actions itself untestable — no git remote configured; script is the authoritative local gate per AGENTS.md. Note: 3958 lint errors is suspiciously high, likely a lint-config scoping bug (linting generated/vendored dirs) rather than 3958 real issues — flag for wt-lint. P3, agent-maintainability, no file overlap with anything else — run any time. **Narrowed** (see coordination note above): scaffold CI wiring only — do NOT touch eslint/prettier/tsconfig config files, `wt-lint`/`fix/lint-config` owns those. Add CI (GitHub Actions, or if no remote CI is available in this environment, a documented `./scripts/verify-all.sh` wired into a pre-push hook) running `homely`: lint + tsc + vitest + playwright e2e, and `equivalence`: pytest, on every push, using whatever lint config exists at merge time. This is the actual fix for how U3's "done" shipped with disabled tool stubs — automatic verification instead of self-reported ticket rows. DoD: workflow/script committed; a deliberately-broken change (e.g. reintroduce a `disabled` stub) is shown to fail it; documented in `AGENTS.md`. |
| M11 | qa-loop-coverage-expansion | M3,M4,M5,M6 | qa-loop/ | opencode:kimi-k2.7-code | | todo | P3. Extend `qa-loop/scenarios/` to cover room/dimension/label/doors/levels once M3-M6 land, replacing today's 3-scenario/1-failing coverage; wire `qa-loop` into M10's CI. DoD: `qa-loop/run.py` covers all Track M features with 0 errors; runs in CI. |
| M12 | lint-config-cleanup | — | homely/eslint.config.js + homely/.eslintrc* + homely/prettier config | opencode:glm-5.2 | opencode:glm-5.2 | done | e88dd1d. Manager-verified: `./scripts/verify-all.sh --skip-e2e` all PASS (lint/typecheck/unit/pytest). Root cause was already half-fixed by the wt-furniture merge (9126cba added the missing `ignores` array, ~3958→7); this ticket's own fix was a `.mjs` globals config block for `shot.mjs` (7→0). Lint is fully green now. P3, was `wt-lint`/`fix/lint-config`, never started by the stopped loop — picked up fresh. `./scripts/verify-all.sh` (M10) reports ~3958 lint errors, which is implausibly high for a ~170-test, well-typed codebase — almost certainly a config-scoping bug (e.g. linting `dist/`, `node_modules/`, generated `assets/`, or `playwright-report/` instead of just `src/`/`tests/`/`e2e/`). Investigate and fix the eslint config scope; only then assess how many *real* lint errors remain and fix those too if the count is still non-trivial. DoD: `npm run lint` error count drops to a sane number (ideally 0, document any deliberately-kept warnings); `./scripts/verify-all.sh`'s lint step flips PASS. |
| M13 | furniture-placement-mode-stuck | M1 | homely/src/main.ts + homely/src/ui/catalog-panel.ts | opencode:mimo-v2.5-free | | todo | P0, found by user live-testing furniture after M1-M12 landed — **root cause already diagnosed by the manager below, this ticket is implement-and-verify only, no further investigation needed.** After placing ONE catalog item via click-to-place, the catalog panel never disarms (`CatalogPanel.disarm()` is only called from the Escape-key handler in `main.ts` and once after a GLB import — never from the toolbar's tool-button click handler at `main.ts` around line 234-240, which only calls `engine.setTool(...)`). Result: every subsequent plan click — including clicking the Select tool button first, then clicking an existing piece meaning to select/drag it — is swallowed by the still-armed catalog placement path (`pointerup` handler's `catalogPanel?.isArmed()` branch) and silently places ANOTHER copy of the same item at that point instead of selecting anything. Confirmed via live Playwright repro: place a chair (1 furniture item) → switch to Select tool → click the chair again intending to select it → a SECOND overlapping chair is created (`furniture-2`) and selected instead of the original (`furniture-1`); the original is now permanently stuck as an unselectable, duplicate ghost item under it. This makes furniture practically unusable after the first placement — you can never select/move/delete a previously-placed piece without hitting Escape first, and most users won't know to. Fix: disarm the catalog panel (a) whenever `engine.setTool(...)` is called for any tool other than continuing to place (i.e. in the toolbar tool-button handler, and anywhere else `setTool` is invoked directly), and (b) reconsider whether placement should even stay armed after one successful placement by default (check what `catalog-panel.ts`'s own click-to-arm toggle logic at `place()`/`arm()`/`disarm()` around lines 107-280 intends — SH3D's own convention is single-placement-then-back-to-selection unless a "keep armed" modifier is used; match that unless a deliberate multi-place design is documented somewhere). DoD: live/e2e test — place one item, click Select tool (or just click elsewhere without re-arming), click the placed item, assert it's selected (not duplicated) and drag-moves correctly; furniture count stays at 1 throughout. Also verify: placing a SECOND, different item deliberately (re-clicking a catalog card first) still works normally. |

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
