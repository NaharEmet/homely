package com.houseequiv.driver;

import com.houseequiv.driver.protocol.Dispatcher;
import com.houseequiv.driver.protocol.FramedServer;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Entry point: boots the real Sweet Home 3D UI on the EDT, then serves the
 * automation protocol on a loopback TCP port.
 *
 * usage: DriverMain --port <tcp-port>
 */
public final class DriverMain {

  private DriverMain() {
  }

  public static void main(String[] args) throws Exception {
    Integer port = null;
    for (int i = 0; i < args.length; i++) {
      if ("--port".equals(args[i]) && i + 1 < args.length) {
        try {
          port = Integer.valueOf(args[++i]);
        } catch (NumberFormatException e) {
          break;
        }
      }
    }
    if (port == null || port <= 0 || port > 65535) {
      System.err.println("usage: DriverMain --port <tcp-port>");
      System.exit(2);
      return;
    }

    // Keep user prefs out of ~/.eteks and out of the repo: scratch dir per run.
    Path prefsDir = Files.createTempDirectory("sh3d-driver-prefs");
    System.setProperty("com.eteks.sweethome3d.preferencesFolder", prefsDir.toAbsolutePath().toString());

    Sh3dApplication app = new Sh3dApplication();
    System.out.println("[driver] booting Sweet Home 3D UI (version " + app.version() + ")...");
    app.bootOnEdt();
    System.out.println("[driver] UI ready, home frame displayed");

    Dispatcher dispatcher = new Dispatcher(app);
    InteractionCommands.register(dispatcher, app);
    String hello = "{\"type\":\"hello\",\"app\":\"sh3d-driver\",\"version\":"
        + quote(app.version()) + ",\"mode\":\"ui\"}";
    new FramedServer(port, dispatcher, hello).start();
  }

  private static String quote(String s) {
    return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
