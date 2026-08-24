# Architecture Map - SH3D to Homely + Equivalence Harness

Authoritative research record. Agents: read this before exploring source.
Source tree: `sweethome3d-7.5-wayland-patch/` (v7.5, GPL v2, pre-built at
`build/SweetHome3D.jar`, libs in `lib/`). SRC below = that dir +
`/src/com/eteks/sweethome3d`.

## 1. Original application (Sweet Home 3D 7.5)

Strict MVC.

- Model (`SRC/model/`): `Home` aggregates walls(Collection), rooms,
  furniture(List of HomePieceOfFurniture), levels, polylines,
  dimensionLines(Collection), labels(Collection), camera (top),
  observerCamera, storedCameras, environment (HomeEnvironment), compass,
  print. All objects extend HomeObject (string id since v5.3).
  Units: centimeter floats internally, angles in radians.
- Key geometry fields:
  Wall: xStart,yStart,xEnd,yEnd,thickness,height,heightAtEnd,arcExtent,
  left/right SideColor/Texture/Shininess/Baseboard,pattern,topColor,level.
  Room: points(float[][]), name/area offsets+styles, floorVisible/floorColor/
  floorTexture, ceiling fields. Furniture: catalog dims (width/depth/height)
  vs plan dims (*InPlan), x,y,elevation,angle,pitch,roll,
  modelRotation(float[3][3]), color/texture/shininess, movable,resizable,
  doorOrWindow, level. Level: elevation,floorThickness,height,visible,
  viewable,elevationIndex. Camera: x,y,z,yaw,pitch,fieldOfView,lens.
- Defaults: wallHeight 250cm; top camera pos(50,1050) z=1010, yaw pi,
  pitch pi/4, FOV 63 deg; observer camera eye height 170cm, yaw 7pi/4,
  pitch pi/16, FOV 63 deg ("35mm lens"). Created in model/Home.java (~line 412).
- Controllers (`SRC/viewcontroller/`): HomeController owns PlanController,
  HomeController3D, FurnitureController, FurnitureCatalogController plus
  Swing UndoableEditSupport + UndoManager (undo history lives controller-side;
  Home model has NO undo stack). PlanController.Mode: SELECTION/PANNING/
  WALL_CREATION/ROOM_CREATION/POLYLINE_CREATION/DIMENSION_LINE_CREATION/
  LABEL_CREATION (extensible class, not enum). Interaction state machine:
  ~40 inner ControllerState subclasses. Mouse entry points take MODEL cm:
  pressMouse(x,y,clickCount,shiftDown,duplicationActivated[,alignmentActivated,
  magnetismToggled,pointerType]), moveMouse(x,y), releaseMouse(x,y), plus
  escape(), deleteSelection(), moveSelection(dx,dy), zoom(factor).
- Actions: HomeView.ActionType enum (~150 constants) wired via
  swing/HomePane.createActions to controller methods through
  swing/ControllerAction (reflection). Invokable headlessly:
  homePane.getActionMap().get(ActionType.X).actionPerformed(null).
  Notables: NEW_HOME, SAVE, OPEN, UNDO, REDO, CUT/COPY/PASTE, DELETE,
  SELECT_ALL, CREATE_WALLS, ADD_LEVEL (planController.addLevel()),
  ZOOM_IN/ZOOM_OUT, VIEW_FROM_TOP/OBSERVER.
- Views/rendering (`SRC/swing/`, `SRC/j3d/`): Java3D over JOGL
  (lib/java3d-1.6/). swing/PlanComponent (2D canvas):
  convertXPixelToModel / convertYPixelToModel, convertXModelToScreen/Y,
  getScale/setScale, paint() usable into any Graphics2D.
  swing/HomeComponent3D (3D): SimpleUniverse onscreen/offscreen universes,
  view.setFieldOfView(...); paint/print supported.
- File format: .sh3d = ZIP. Entry "Home" = Java serialization (legacy);
  entry "Home.xml" = attribute-oriented XML written by io/HomeXMLExporter,
  read by io/HomeXMLHandler (de-facto schema; no DTD file exists anywhere).
  Reader prefers Home.xml since 5.3. Other entries = content images/models.
  .sh3x = future XML-only variant.
- Plugins (`SRC/plugin/`): jar with ApplicationPlugin.properties dropped in
  app plugins folder; receives getHomeController()/getUserPreferences()/
  getUndoableEditSupport(). NOT needed by us - we link jars directly.
- Existing tests (`test/com/eteks/sweethome3d/junit/`): JUnit3 + Abbot
  (libtest/abbot.jar). PlanControllerTest shows the canonical programmatic
  driving pattern we copy:

```java
planController.setMode(PlanController.Mode.WALL_CREATION);
planController.moveMouse(20,20);                 // cm model coords
planController.pressMouse(20,20,1,false,false);  // clickCount,shiftDown,duplication
planController.releaseMouse(20,20);
```

Run inside EDT via EventQueue.invokeAndWait with real SwingViewFactory.
- Magnetism toggle modifier: VK_ALT (Windows/Linux) else VK_META (macOS) -
  see TestUtilities.getMagnetismToggleKey(); our protocol passes magnetism
  explicitly instead (set_magnetism command).

## 2. Clone (homely/) target design

Tauri v2 shell + Vite + TypeScript + Three.js. Platform seams:

```
src/core/    pure model store (walls/rooms/furniture/levels/cameras),
             command layer, undo/redo stack, cm units, opaque ids
src/plan/    2D canvas renderer + tool state machine mirroring
             PlanController semantics (wall chaining, double-click ends,
             magnetism snap, room auto-detection on closed loop)
src/view3d/  Three.js scene built from core store; camera defaults must
             match SH3D (63 deg FOV etc.)
src/services/storage.ts   interface only; adapters/tauri-fs.ts now,
                          server-sync.ts later (web/multi-user future)
src/services/auth.ts      no-op desktop stub now
src/automation/client.ts  WS client implementing docs/specs/ws-protocol.md
```

Rules: core has zero platform imports; all persistence goes through
storage interface; project document conforms to docs/schema/home-project.schema.json.

## 3. Equivalence harness (equivalence/eq/)

Python package `eq`. Orchestrator owns a WebSocket server; adapters connect out.

```
adapters/base.py    Adapter ABC mirroring ws-protocol.md commands
adapters/sh3d.py    spawns driver-java process (TCP variant, same framing)
adapters/homely.py  tauri mode: spawn binary with HOMELY_AUTOMATION_PORT
                    web mode (later): playwright page load with ?automation=
adapters/mock.py    in-process reference impl (schema-conformant) so Tracks C
                    never blocks on A/B
dsl/schema.py       YAML scenario schema: setup/steps/checkpoints/assertions,
                    target selector {os:[...], mode:[...]} reserved
comparators/state.py     deep diff w/ tolerances pos 0.01cm angle 0.05deg
                         color exact; creation-order ledger for object matching
comparators/geometry.py  wall length/angle error, room area/IoU,
                         furniture bbox IoU + rotation delta
comparators/visual.py    Pillow pixel-diff % + heatmap png; baselines keyed
                         {platform}-{mode}
reporting/report.py      results/<run-id>/{summary.json,report.md,...}
cli.py              ./test-equivalence <scenario-path> [--level N]
```

Scenario runner semantics: execute each step on every selected adapter in
lockstep; snapshot NormalizedHomeState at checkpoints; undo/redo template
auto-generated around mutation steps (capture B, undo expect A, redo expect B).

## 4. sh3d-driver (equivalence/driver-java/)

Java 21 process linking build/SweetHome3D.jar + lib/*.jar. Boots real UI on
DISPLAY (:1 here; xvfb in CI), opens TCP server implementing ws-protocol.md.
Executes via controllers per section 1 pattern; state export walks Home object
directly into schema JSON; screenshots via PlanComponent.paint /
 HomeComponent3D offscreen render into BufferedImage at requested size;
save/open through DefaultHomeOutputStream/Input (produces/consumes Home.xml).

GPL note: this driver links GPL code and stays inside equivalence/driver-java/
under GPL-compatible terms. Homely NEVER imports SH3D code/assets without a
licence audit (catalog models are mixed third-party licences).

## 5. Test levels

L1 fast deterministic clone unit tests (clone-dev, constantly)
L2 clone integration via mock harness adapter
L3 golden screenshot checks (per platform-mode baseline)
L4 SH3D differential (Linux only; needs GUI)
L5 property/fuzz vs clone (nightly later)

## 6. Environment facts (verified 2026-08-24)

- Linux, X11 DISPLAY=:1 (Wayland session absent today)
- openjdk 21.0.11, node v24.19.0 present; rustup installing (Wave 0)
- sweethome3d prebuilt jar exists: build/SweetHome3D.jar
- No DTD file exists for Home.xml; treat exporter+handler as schema
