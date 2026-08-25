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
| A1 | driver-boot | D1 | equivalence/driver-java | driver-dev | driver-dev | review | smoke 9/9 PASS; see ticket README |
| A2 | driver-interact | A1 | equivalence/driver-java | driver-dev | driver-dev | review | smoke 26/26 PASS; 4-wall room + undo/redo/copy/paste verified; screenshot via debug_screenshot |
| A3 | driver-state | A2 | equivalence/driver-java | driver-dev | driver-dev | review | smoke 46/46 PASS; full schema export validated 11x jsonschema; steward lifecycle backfilled OK |
| A4 | driver-capture-io | A2 | equivalence/driver-java | driver-dev | driver-dev | review | smoke 63/63 PASS; plan+3d captures byte-identical; save/open round-trip stable |
| B1 | homely-scaffold | D1 | homely/ | clone-dev | clone-dev | review | 3650f6b build+test+smoke+tauri dev window verified |
| B2 | homely-core | B1 | homely/src/core | clone-dev | clone-dev | review | 0294efd 44/44 tests, adversarial review 10/10 findings fixed, harness equivalence 22/22+21/21, add_furniture deviation noted in docs/behaviours |
| B3 | plan-view | B2 | homely/src/plan | clone-dev | | todo | |
| B4 | view3d | B2 | homely/src/view3d | clone-dev | | todo | |
| B5 | homely-capture | B2 | homely/src/automation | clone-dev | | todo | |
| C1 | dsl | D1 | equivalence/eq/dsl | harness-dev | harness-dev | review | 19 pytest pass; ruff clean |
| C2 | orchestrator | C1 | equivalence/eq/adapters | harness-dev | harness-dev | review | mock+ws/tcp server+lockstep runner+ledger; 21 pytest pass; demo writes repo-root results/ (add /results/ to .gitignore?) |
| C3 | comparators | C2 | equivalence/eq/comparators | harness-dev | harness-dev | review | deep-diff tolerances + ledger id-matching + geometry metrics + assertion eval + comparison.json; 21 pytest pass (61 total); ruff clean |
| C4 | reporting-cli | C2 | equivalence/eq/reporting | harness-dev | harness-dev | review | run_suite+summary.json+report.md L0-2 + ./test-equivalence wrapper (--level/--target); 12 pytest pass (73 total); ruff clean |
| C5 | visual-diff | C2,A4,B5 | equivalence/eq/comparators | harness-dev | | todo | waits on captures |

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
