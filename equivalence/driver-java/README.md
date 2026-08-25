# sh3d-driver (Track A)

Java 21 driver that boots the **real** Sweet Home 3D UI and exposes it over the
automation protocol (`docs/specs/ws-protocol.md` v1, newline-delimited JSON on
a loopback TCP port). The orchestrator connects in as a TCP client.

## Layout

```
src/com/houseequiv/driver/
  DriverMain.java          --port parsing, prefs scratch dir, boot, server start
  Sh3dApplication.java     SweetHome3D subclass: single-frame boot + new_home swap
  protocol/FramedServer.java  loopback TCP, hello-on-connect, one response/request
  protocol/Dispatcher.java    command registry, id echo, error codes
lib/gson-2.11.0.jar       vendored Apache-2.0 JSON lib
build.sh / run.sh         compile & launch against prebuilt SH3D dist
smoke_client.py           A1 DoD verification script
```

## Boot recipe (why it works without `SweetHome3D.init()`)

`init()` does splash/single-instance/JNLP/auto-recovery — all unwanted here.
Instead:

1. Subclass `SweetHome3D` (protected ctor is fine from a subclass). Never call
   `init()`; therefore SH3D's own `addHomesListener` never fires and no frames
   appear on their own.
2. `getUserPreferences()` lazily creates `FileUserPreferences`; we point sysprop
   `com.eteks.sweethome3d.preferencesFolder` at a per-run temp dir.
3. One frame, driven by us:
   `frameController = createHomeFrameController(createHome()); displayView();`
   on the EDT. `HomeController.newHome()` is NOT used because it would add a
   home to the application list and spawn an extra window per call.
4. `new_home` = create fresh home + **fresh HomeFrameController** (fresh undo
   stack => "resets home + clears undo"), display it, dispose the old window.
5. Replicates `addComponent3DRenderingErrorObserver` so Java 3D errors are
   logged instead of silently exiting.

## Build & run

```bash
./build.sh                 # javac --release 17 (JDK 17; box has no full JDK 21)
DISPLAY=:1 ./run.sh 9440   # boots UI, then "[driver] listening on 127.0.0.1:9440"
python3 smoke_client.py 9440
```

run.sh prepends `lib/java3d-1.6/*.jar` (wins over duplicate older j3d copies in
top-level `lib/*.jar`), adds `$SH3D_ROOT/libtest/jnlp.jar` (SweetHome3D.jar
references javax.jnlp at class-init), sets `-Djava.library.path=.../java3d-1.6/linux/amd64`,
`-Djogamp.gluegen.UseTempJarCache=false`, and the Java 16+ flags
`--add-opens=java.desktop/java.awt` / `sun.awt` (required by JOGL's
JoglPipeline accessing sun.awt.X11GraphicsDevice).

Runtime JVM constraints learned the hard way:
- openjdk-21-jre-headless lacks `libawt_xawt.so` → HeadlessException in
  Java3D init. run.sh picks the newest JVM that HAS libawt_xawt.so (here JDK 17).
- The rendering-error observer is installed first thing; if Java3D's
  VirtualUniverse fails once it stays failed for the process.

## Protocol surface (A1)

- connect → unsolicited `{"type":"hello","app":"sh3d-driver","version":"7.5","mode":"ui"}`
- `ping` → `{pong:true}`
- `new_home` → `{}` (fresh home + fresh undo stack)
- `get_capabilities` → `{commands:[...]}` derived from the registry keys
- unknown type → `{ok:false,error:...,code:"UNKNOWN_COMMAND"}`
- malformed line / missing type → `code:"BAD_REQUEST"`; handler exception → `"INTERNAL"`

## Protocol surface (A2 interact)

All coordinates are model cm (floats). UI-touching handlers marshal via EDT.

- `select_tool {tool}` — selection|panning|wall_creation|room_creation|
  polyline_creation|dimension_line_creation|label_creation (aliases:
  walls, rooms, polyline, dimension_line, label, pan, select)
- `press_mouse {x,y,click_count=1,shift=false,duplication=false}` /
  `move_mouse {x,y}` / `release_mouse {x,y}` — raw PlanController gestures
- `click {x,y}` — move+press(count 1)+release
- `double_click {x,y}` — press(count 2)+release ONLY (no move, no count-1
  press); used to close a wall loop after a click on the start point
- `key {key}` — escape|delete|backspace (PlanController.escape/deleteSelection)
- `set_magnetism {enabled}` — UserPreferences.setMagnetismEnabled
- `undo` / `redo` — HomeController.undo/redo
- `delete_selection`, `select_all` (PlanController.selectAll — the
  HomeController variant no-ops without Swing focus), `clear_selection`
- `copy_selection` / `cut_selection` / `paste` — driver-side clipboard stored
  as Java-serialized bytes (deep copies, mirroring HomeTransferableList);
  pasting live references would alias walls and corrupt undo
- `get_state` — minimal read: `{walls:[{id,x_start,y_start,x_end,y_end,height,
  height_at_end,thickness}],selection:[ids]}` with driver-assigned ids
  (wall-N, reset per new_home). Full NormalizedHomeState export is A3.
- `debug_screenshot {path}` — debug-only: paints the live frame to a PNG
  (not part of the equivalence surface; A4 owns deterministic renders)

### Wall-loop recipe (verified)

`select_tool wall_creation; set_magnetism false;` then for each corner
move_mouse+click; finish with move_mouse to the start point, `click` (commits
the last wall), then `double_click` at the start point (joins the loop and
validates). A double_click WITHOUT the preceding click moves the previous
wall's end to the start point, producing a diagonal wall instead of the
closing segment.

## Verification transcript (A1 DoD)

```text
$ DISPLAY=:1 ./run.sh 9440 &
[driver] booting Sweet Home 3D UI (version 7.5)...
[driver] UI ready, home frame displayed
[driver] listening on 127.0.0.1:9440
$ python3 smoke_client.py 9440
PASS hello.type == "hello" ({'type': 'hello', 'app': 'sh3d-driver', 'version': '7.5', 'mode': 'ui'})
PASS ping round-trip ({'id': 1, 'ok': True, 'data': {'pong': True}})
PASS new_home round-trip ({'id': 2, 'ok': True, 'data': {}})
PASS capabilities lists A1 commands ...
PASS unknown command -> ok:false UNKNOWN_COMMAND ...
smoke OK
```

Window visible on DISPLAY=:1 (xwininfo showed
`"Untitled 2 - Sweet Home 3D" ... com-houseequiv-driver-DriverMain`; the "2"
confirms new_home swapped in a fresh home and exactly one window remains).

## Verification transcript (A2 DoD)

```text
$ DISPLAY=:1 ./run.sh 9441 &
[driver] UI ready, home frame displayed
[driver] listening on 127.0.0.1:9441
$ python3 smoke_client.py 9441     # A1 + A2 suites
...
PASS 4 walls after scripted chain (4 walls)
PASS wall coords match clicked corners ([(100, 100, 300, 100), (100, 300, 100, 100),
      (300, 100, 300, 300), (300, 300, 100, 300)])
PASS default wall height 250cm ({250.0})
PASS driver-assigned wall ids (['wall-1', 'wall-2', 'wall-3', 'wall-4'])
PASS undo removes walls (0 left)
PASS redo restores walls (4)
PASS select_all selects walls (5 selected)
PASS clear_selection empties selection ([])
PASS copy+paste duplicates walls (8 walls)
PASS key delete clears selected walls ([])
PASS escape ends chain without stray wall (0 walls)
PASS new_home resets state ([])
smoke OK                            # 26/26 assertions
```

Screenshot proof: `debug_screenshot` of the live frame after the scripted
4-wall room shows the closed 2m x 2m square in the plan view
(/tmp/opencode/a2-room3.png; window title "Untitled 2 - Sweet Home 3D").

## Protocol surface (A3 full state export)

`get_state` now returns the complete NormalizedHomeState per
`docs/schema/home-project.schema.json` v1: `schemaVersion`, `name`,
`levels`, `walls`, `rooms`, `furniture`, `dimensionLines`, `labels`,
`compass`, `cameras{top,observer}`, `environment`, `selection`,
`activeTool`, `capabilities{canUndo,canRedo}`.

Semantics worth remembering:

- **SH3D default homes have ZERO Level objects.** A fresh home exports
  `levels: []`; every object's `levelRef` is `null` (= implicit level 0,
  exactly what the schema's `ref` def means by "null for default level").
  Do not synthesize a fake default level.
- Angles (furniture/camera/label/compass) are converted radians → degrees
  and normalized to (-180, 180], rounded half-even to 3 decimals; lengths
  likewise 3 decimals. `arcExtent` stays in radians (schema says so).
- `capabilities.canUndo/canRedo` come from the controller's private
  `UndoManager` via reflection (`setAccessible` is fine — SH3D classes are
  on the classpath, i.e. the unnamed module). There is no public accessor.
- Camera ids are stable strings (`camera-top-1`, `camera-observer-1`);
  selection maps each selected model object through the same IdAssigner as
  its collection, so a wall's id is identical inside `walls[]` and
  `selection[]`.
- `environment.skyColor/groundColor/lightColor` are always ints in SH3D
  (never null); schema allows that.

## Verification transcript (A3 DoD)

```text
$ DISPLAY=:1 ./run.sh 9442 &
[driver] UI ready, home frame displayed
$ ../../.venv/bin/python smoke_client.py 9442    # A1 + A2 + A3 suites
PASS get_state #1 validates against schema (None)      # empty home
...
PASS get_state #11 validates against schema (None)     # after new_home
PASS wall coords match clicked corners ([(100, 100, 300, 100), ...])
PASS canUndo after createWalls ({'canUndo': True, 'canRedo': False})
PASS copy+paste duplicates walls (8 walls, unique ids)
smoke OK                            # 46/46 assertions, exit 0
```

Every one of the 11 `get_state` payloads captured during the run
(empty → populated room → undo → redo → paste → delete → escape →
fresh new_home) validated against the frozen schema with python
jsonschema 4.26.

## Notes / limitations

- GPL: this code links the prebuilt SH3D jars and must stay inside
  `equivalence/driver-java/`; nothing here may leak into `homely/`.
- All UI-touching handlers marshal via `EventQueue.invokeAndWait`.
- The 3D pane prints black in `debug_screenshot` (JOGL heavyweight canvas
  does not render through printAll); the plan view renders fully.
