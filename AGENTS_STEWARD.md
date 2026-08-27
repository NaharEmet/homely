Repo: house_designer

# AGENTS_STEWARD — house_designer workspace

Multi-agent workspace rebuilding Sweet Home 3D as "Homely" (Tauri + Three.js)
with a Python equivalence harness that differentially tests the original
Java app against the clone.

## Layout & ownership (STRICT)

| Directory | Owner track |
|---|---|
| `sweethome3d-7.5-wayland-patch/` | READ-ONLY reference. Never modify or commit changes to it. |
| `equivalence/driver-java/` | driver-dev |
| `equivalence/eq/`, `equivalence/scenarios/` | harness-dev |
| `homely/` | clone-dev |
| `docs/schema/`, `PLAN.md`, repo root files | integrator (grace) only for edits; all may read |
| `docs/behaviours/` | append-only, any agent |

## Coordination protocol

1. `PLAN.md` is the live claim board. Read it first. Claim by editing your row
   and committing `board: claim <ticket-id>`.
2. Steward lifecycle per ticket: `claim_work(task_id)` → `lock_file` every file
   before editing → implement → verify with the ticket's commands →
   save learnings (`save_memory`/`skill_save`) → unlock → commit →
   board row → `release_work` → `submit_task_feedback` LAST.
3. Shared checkout on branch `main`. Tracks own disjoint directories.
   Never edit outside your owner dirs (except: your PLAN.md row,
   append-only docs/behaviours/).
4. Contracts (`docs/schema/home-project.schema.json`,
   `docs/specs/ws-protocol.md`) are frozen by integrator; change requests go
   through a `blocked` board note.

## Key facts (from architecture research — do not re-derive)

- SH3D 7.5 source at `sweethome3d-7.5-wayland-patch/`; pre-built jar in
  `build/SweetHome3D.jar`; GPL v2 — Homely must never import its code.
- Drive SH3D via controllers in centimeter model coordinates:
  `PlanController.pressMouse/moveMouse/releaseMouse/setMode(Mode)`.
- Units everywhere: cm lengths, radians angles internally; normalized state
  uses cm + degrees.
- Camera defaults: FOV 63deg, top camera z=1010 pitch 45deg, observer eye 170cm
  yaw 315deg pitch 11.25deg. Default wall height 250cm.

## E2E tests (Playwright) — MANDATORY for UI work

All agents working on `homely/` UI or 3D viewport MUST run E2E tests before
committing. Unit tests (`vitest run`) are NOT sufficient for UI changes.

### Required verification

| Change area | Run |
|---|---|
| `src/main.ts`, `src/ui/`, `src/style.css` | `npm run e2e` |
| `src/view3d/`, `src/render/` | `npm run e2e` |
| `src/plan/` | `npm run e2e` |
| `src/core/` (model changes affecting UI) | `npm run e2e` |

### Quick reference

```bash
cd homely
npm run e2e                    # headless, full suite
npm run e2e:open               # headed browser, interactive
npx playwright test --ui       # Playwright test runner UI
npx playwright show-trace ...  # replay failed trace
```

### Adding new E2E tests

1. Create `e2e/<name>.spec.ts`
2. `beforeEach`: `page.goto('/')` + `page.waitForSelector('#view3d canvas')`
3. Plan interactions: `page.mouse.click()` on `#plan-canvas` coordinates
4. Tool/camera: `page.locator('button[data-tool="wall"]').click()`
5. WebGL checks: `page.evaluate()` to read canvas pixels
6. Visual regression: `await expect(locator).toHaveScreenshot('name.png')`

### Steward notes

- E2E tests auto-start the Vite dev server (port 1420) via `webServer` config
- Screenshots fail on first run (no baseline); use `--update-snapshots` to set
- Chromium only (WebGL required; no Firefox/Safari)
- Trace files saved on failure for debugging
