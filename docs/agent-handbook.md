# Homely Agent Handbook

## What is Homely?

Homely is a from-scratch rebuild of [Sweet Home 3D](http://www.sweethome3d.com/)
as a modern local-first app: **Tauri v2** (Rust + WebView) frontend, **Three.js**
3D renderer, TypeScript model layer. A **Python equivalence harness** runs
scenarios against both the original Java SH3D and the new Homely clone, comparing
exported state to ensure parity.

## Repository layout

```
house_designer/
├── PLAN.md                  ← claim board (agent coordination hub)
├── AGENTS.md                ← Steward/Guidance config for agent sessions
├── docs/
│   ├── architecture-map.md  ← research facts (read before any work)
│   ├── schema/
│   │   └── home-project.schema.json   ← frozen: NormalizedHomeState v1
│   ├── specs/
│   │   └── ws-protocol.md            ← frozen: automation WebSocket protocol v1
│   └── behaviours/
│       ├── sh3d-plan-tool-behaviours.md   ← wall/room/dimension tool semantics
│       └── sh3d-camera-and-export.md      ← camera follower + export rounding
├── equivalence/             ← Python harness
│   ├── eq/                  ← core library (dsl, adapters, comparators, reporting)
│   ├── scenarios/           ← YAML scenario definitions
│   │   ├── slice/           ← live E2E scenarios (real apps)
│   │   └── walls/           ← legacy scenarios
│   ├── matrix/
│   │   └── features.yaml    ← scenario → contract → ticket mapping
│   └── driver-java/         ← Java SH3D automation server
├── homely/                  ← Tauri + TS clone
│   ├── src/
│   │   ├── core/            ← model, store, cameras, compass, top-camera-follower
│   │   ├── plan/            ← PlanEngine (wall tool state machine)
│   │   ├── view3d/          ← Three.js scene, renderer
│   │   ├── automation/      ← WS client + capture service
│   │   └── tauri/           ← Tauri invoke hooks
│   └── tests/               ← vitest suite
└── results/                 ← E2E run outputs (gitignored)
```

## Frozen contracts

Three documents are **frozen** — only the integrator may change them:

| Contract | Path | What it defines |
|----------|------|-----------------|
| Home schema | `docs/schema/home-project.schema.json` | NormalizedHomeState JSON shape |
| WS protocol | `docs/specs/ws-protocol.md` | Automation WebSocket commands |
| SH3D behaviours | `docs/behaviours/*.md` | Observed SH3D semantics (wall tool, camera, export) |

If you discover a contract gap: set your board row to `blocked`, write the
gap in Notes, and stop. The integrator will update the contract and unblock.

## Agent tracks

| Track | Owner dir | What it builds |
|-------|-----------|----------------|
| driver-dev (A) | `equivalence/driver-java/` | Java automation server |
| clone-dev (B) | `homely/` | Tauri + TypeScript clone |
| harness-dev (C) | `equivalence/eq/`, `equivalence/scenarios/` | Python E2E harness |
| integrator (D) | `docs/`, `PLAN.md`, `equivalence/matrix/` | Contracts, board, E2E |

## Board workflow

1. **Read PLAN.md** → find your next `todo` row (deps must be `done`).
2. **Claim**: edit your row → `claimed`, commit `board: claim <TICKET>`.
3. **Lock files** via steward before editing.
4. **Implement** to the ticket's DoD.
5. **Verify** using the commands in PLAN.md (run BEFORE setting review).
6. **Review**: flip row → `review`, commit `<track>: <TICKET> ...`.
7. **Release**: steward release_work + submit_task_feedback.
8. **Integrator verifies** independently → sets `done`.

## Running E2E tests

```bash
# Full suite (mock adapters, no real apps):
./test-equivalence

# Single scenario (mock):
./test-equivalence slice/create_room

# Live E2E (real driver + real homely):
EQ_SH3D_PORT=9450 ./test-equivalence slice/create_room.yaml --live --target linux,tauri
# (prints HOMELY_AUTOMATION_PORT=<port> — launch homely with that env var)
```

## Common pitfalls

- **pkill -f matches own shell**: use `kill <PID>` or `fuser -k <port>/tcp` instead.
- **cargo not on PATH**: non-interactive shells need `PATH="$HOME/.cargo/bin:$PATH"`.
- **Stale dev servers**: kill old homely processes before a new E2E run (ports change).
- **Absent vs null**: the harness treats absent keys and null values as equal (C8).
- **Camera follow**: the top camera moves automatically when items change (B7). This is
  SH3D behaviour, not a bug.

## SH3D source references

The Java SH3D 7.5 source with Wayland patches lives at:
`/home/nahar/Documents/code/sweethome3d-7.5-wayland-patch/`

Key files referenced by tickets:
- `PlanController.java` — wall/room tool state machine
- `HomeController3D.java:823-1330` — TopCameraState follower
- `InteractionCommands.java` — automation command handler
- `Compass.java:418-1072` — timezone → geographic coords table
- `Home.java` — model defaults (cameras, environment)
- `Wall.java` — getShapePoints() mitered corners
