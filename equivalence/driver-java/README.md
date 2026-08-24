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

## Notes / limitations

- GPL: this code links the prebuilt SH3D jars and must stay inside
  `equivalence/driver-java/`; nothing here may leak into `homely/`.
- A2 (interact), A3 (state export) will extend Dispatcher with more commands;
  `get_capabilities` picks them up automatically.
- All UI-touching handlers marshal via `EventQueue.invokeAndWait`.
