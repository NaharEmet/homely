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
| B9 | wall-id-draw-order | B8 | homely/src/plan + homely/src/core | clone-dev | clone-dev | review | Root cause: engine deferred ALL wall creation to addWallChain at dbl-click (ids minted at validate). SH3D truth (PlanController WallDrawingState + :10912): each wall enters home AT ITS CLICK; validateDrawnWalls only posts ONE compound undo edit + selects drawn walls. Fix: HomeStore.begin/endCompoundEdit (undoSupport beginUpdate/endUpdate parity, follower still runs per apply so mid-chain camera positions match contract §1); PlanEngine commits via model.addWall per click, seals session at validate, selection = session ids in draw order → exported ids are wall-1..wall-4. NOTE: raw tauri state in run 130527 ALREADY matched the golden — the 8 reported diffs were harness artifacts (sh3d ledger baseline polluted by stale driver-app walls: created=[wall-3,wall-4]; IdMap ordinal pairing then rotated homely's correct ids). Harness/driver-side follow-up for D2/C: diff ledger against post-setup baseline or start apps fresh. Verified: vitest 112/112 incl new tests/wall-draw-order.test.ts replaying exact slice (golden ids+selection+rooms=0+one-step undo/redo + per-click camera rows), tsc/eslint/build clean. | 20260826-130527-suite: only remaining diffs (8) are wall ids rotated by 2: exported walls carry [wall-3,wall-4,wall-1,wall-2] vs driver [wall-1..4]; array ORDER matches (0 geometry diffs), selection follows ids. Suspect: wall tool defers creation to addWallChain at double-click and traverses cycle from wrong segment; SH3D PlanController commits each wall at each click (top camera moved at click 2 = first wall committed) so home insertion order == draw order. Fix creation timing/order so exported ids are wall-1..wall-4 in draw order; keep compound-undo semantics of validate. DoD: vitest replaying exact slice script asserts ids+selection match goldens/create_room.expected-state.json; tsc/eslint/build clean. |
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
| D3 | docs-matrix | D2 | equivalence/matrix | grace | | todo | features.yaml seeded from scenario inventory; agent handbook; behaviour-notes template |

## Sequencing waves

```
W0  DONE (grace): D0 D1
W1  parallel:      driver-dev:A1   clone-dev:B1   harness-dev:C1→C2(mock)
W2  after boot:    driver-dev:A2→A3‖A4          clone-dev:B2→B3‖B4,B5
                   harness-dev:C3‖C4 (mock-backed, never waits on A/B)
S1  sync point:    A4+B5 landed → C5 unblocked; golden captures possible
W3  integration:   grace runs vertical slice E2E; failures become new board rows
W4  close-out:     D3 matrix/docs (grace + all)
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
