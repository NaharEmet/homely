# SH3D plan-tool behaviours (observed, for clone parity)

> Source of truth: sweethome3d-7.5-wayland-patch sources, verified
> empirically by driver-dev while building Track A (A1–A4). Append-only.
> Line refs: PlanController.java / WallCreationState / WallDrawingState are
> inside `src/com/eteks/sweethome3d/viewcontroller/PlanController.java`
> (states are inner classes).

## Wall tool state machine (what B3 plan-view must replicate)

1. **Chain start comes from last mouse-move, not from press.**
   WallCreationState.pressMouse transitions to WallDrawingState whose
   enter() takes the chain start from `xLastMouseMove/yLastMouseMove`.
   A click at point P must therefore be preceded by a move to P.
   Driver recipe (works): `move_mouse(P)` → `click(P)` → …
2. **Single press commits a wall and continues the chain.**
   In WallDrawingState a press with clickCount=1 commits the current
   in-progress wall if its length > 0 (`endWallCreation`), then the chain
   continues from the wall's end point. Mouse RELEASE does nothing in wall
   mode (no override — walls are not rubber-band drag operations).
3. **Double-press closes/joins; it must be a BARE second press.**
   press with clickCount=2 joins the last wall's end to the remembered
   start endpoint (`joinNewWallEndToWall`) and validates all drawn walls
   (`validateDrawnWalls` → one compound undoable edit, selects them, back
   to WallCreationState). Gotcha: if a `move_mouse` precedes the
   double-press, SH3D drags the last wall's end to that point first —
   we produced a diagonal wall this way. Correct close sequence:
   `click(startPoint)` … then double-press **without moving first**.
4. **Zero-length walls get committed** if any move created a newWall
   before the closing double-press — avoid stray moves mid-chain or you
   get degenerate walls.
5. **escape() cancels the in-progress wall but COMMITS completed ones**
   (`deleteCurrentWall` + `validateDrawnWalls`). It does not undo the chain.
6. **setMode during an active chain** escapes current creation first
   (same validate path), so switching tools never leaks an uncommitted wall.
7. **Magnetism**: persistent flag on UserPreferences
   (`setMagnetismEnabled`); a per-gesture modifier XORs with it
   (`preferences.isMagnetismEnabled() ^ magnetismToggled`). Defaults come
   from preferences, not from the tool.

## Model/interaction facts

- All PlanController mouse methods take MODEL cm floats
  (`pressMouse(x,y,clickCount,…)`), not view pixels. Angles are radians in
  the model; normalized export uses degrees (-180,180] half-even 3dp.
- Default new-wall geometry is seeded from UserPreferences at boot time:
  height/thickness come from locale-dependent defaults (en_US gives 8ft /
  243.84cm!). The driver forces metric + 250cm + 7cm explicitly. Clone
  should use 250cm/7cm constants regardless of OS locale.
- A fresh `createHome()` contains ZERO Level objects; every item's level is
  null (= implicit level 0). Don't synthesize a default level.
- `HomeController.selectAll()` no-ops without a focused Swing view; the
  functional path is `PlanController.selectAll()`. Same pattern likely
  applies to any focus-aware action — prefer controller state methods over
  UI-action synthesis.
- `paste()`/`cut()` MUTATE the passed item list (they move the very objects
  handed in). Anything keeping a clipboard of model items must deep-copy
  (Java serialization works — all model classes are Serializable); SH3D's
  own TransferHandler round-trips through serialized HomeTransferableList.
- select_all also selects the Compass. Deleting the compass NPEs in
  Object3DBranch.detach in a headless-ish boot (3D branch not realized).
  Strip compass from selection before delete.

## Automation protocol notes (for orchestrator-side consumers)

- The driver sends exactly ONE unsolicited line on connect:
  `{type:"hello", app:"sh3d-driver", …}` — clients must consume it before
  reading the first command response.
- One response per request, framed as single-line JSON (\n).
- Offscreen captures: fresh standalone `PlanComponent` + `printAll` into a
  BufferedImage is byte-deterministic across identical calls; the 3D view
  must go through HomeComponent3D.getOffScreenImage (printAll renders the
  JOGL canvas black).
- Undo capability flags are readable from HomeController's private
  undoManager via reflection (no --add-opens needed for unnamed-module
  access).

## Clone-side protocol deviations (pending integrator amendment)

- `add_furniture` (homely clone): ws-protocol.md:79 freezes the shape
  `{catalogId, x, y, angleDeg?}` (catalog-driven add). The homely B2 handler
  accepts the extended inline shape `{name, x, y, angleDeg?, width, depth,
  height, elevation?, catalogId?}` — name + positive width/depth/height are
  required, `catalogId` is optional passthrough. Rationale: the clone has no
  furniture catalog yet, so a catalogId-only add cannot resolve dimensions.
  INVALID_PARAMS otherwise; ids come from the creation-order ledger
  (`furniture-N`). To be reconciled when the integrator amends the frozen doc
  or B-ticket adds a catalog.
