# Homely File Formats

How Homely persists projects and exports images — and what it deliberately does
**not** do with Sweet Home 3D's file format.

## Project save format: Homely JSON, not `.sh3d`

Homely's **Save/Open** (wired in ticket M1, `homely/src/services/adapters/home-persistence.ts`)
uses Homely's own **`NormalizedHomeState` JSON** format:

- JSON Schema: [`docs/schema/home-project.schema.json`](schema/home-project.schema.json)
- `schemaVersion: 1`; units are centimeters (lengths) and degrees (angles);
  coordinates follow the plan-space convention (x right, y down).
- Saving pretty-prints and rounds values via `serializeHome`
  (`homely/src/core/export.ts`). Opening validates the parsed JSON with
  `isNormalizedHome` before loading it into the store.
- The format mirrors SH3D 7.5 *model semantics* (Home, Wall, Room,
  HomePieceOfFurniture, Level, Camera…) but is Homely's own schema.

Homely does **not** read or write Sweet Home 3D's `.sh3d` file format.

## Why: GPL licensing of `.sh3d`

The original SH3D 7.5 source lives in this repo only as a **read-only
reference** at `sweethome3d-7.5-wayland-patch/` and is licensed under the
**GPL v2**. Homely's own code must remain independent of it:

- **Never import, port, or copy SH3D's file-format reading/writing code** (its
  `.sh3d` serialization, `HomeInputStream`/`HomeOutputStream`, XML zip
  handling, etc.) into Homely.
- Behavioural parity is fine (observing what SH3D *does*, per
  `docs/behaviours/`); code transplants are not.

## Cross-format `.sh3d` import/export: out of scope

`.sh3d` import/export is **not implemented** and is out of scope unless a
future ticket adds it cleanly (the `.sh3d` container is a ZIP of XML plus
resources, so a clean-room, spec-based reader is feasible — it would have to be
written from format documentation/observation, never from the GPL source).

## Plan-view PNG export (M9)

**File > Export Plan as PNG…** (`homely/src/services/adapters/plan-export.ts`)
rasterizes the current plan offscreen at 1600×1200 (auto-fit via
`fitToBounds`, reusing the automation screenshot backend in
`homely/src/automation/capture.ts`) and downloads it as `plan.png` via a
`Blob` + `<a download>` — the same download pattern Save uses in the browser.
This works in plain `vite dev` and inside the Tauri webview.
