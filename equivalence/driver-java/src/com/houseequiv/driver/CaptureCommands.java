package com.houseequiv.driver;

import com.eteks.sweethome3d.io.HomeFileRecorder;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.swing.HomeComponent3D;
import com.eteks.sweethome3d.swing.PlanComponent;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.houseequiv.driver.protocol.Dispatcher;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.file.Files;
import java.security.MessageDigest;

/**
 * A4 driver-capture-io: offscreen plan/3D captures and .sh3d save/open.
 *
 * - capture_plan renders a standalone PlanComponent of the CURRENT home at the
 *   requested pixel size (no window chrome). A fresh component per call keeps
 *   two identical calls byte-deterministic; its transient model listeners are
 *   acceptable garbage for harness-scale run counts.
 * - capture_3d delegates to HomeComponent3D.getOffScreenImage(w,h), which
 *   builds + cleans its own offscreen Java3D universe per call (selection is
 *   temporarily cleared by SH3D itself).
 * - save_home/open_home round-trip through HomeFileRecorder (DefaultHome*
 *   streams, INCLUDE_ALL_CONTENT semantics), so files are plain .sh3d.
 */
final class CaptureCommands {

  private CaptureCommands() {
  }

  static void register(Dispatcher dispatcher, Sh3dApplication app) {
    dispatcher.register("capture_plan", params -> app.callOnEdt(() -> {
      requireUi(app);
      Size size = size(params);
      BufferedImage image = renderPlan(app, size.width, size.height);
      return writePng(image, size.width, size.height, string(params, "path"));
    }));

    dispatcher.register("capture_3d", params -> app.callOnEdt(() -> {
      requireUi(app);
      Size size = size(params);
      HomeComponent3D component = new HomeComponent3D(app.home());
      BufferedImage image = component.getOffScreenImage(size.width, size.height);
      return writePng(image, size.width, size.height, string(params, "path"));
    }));

    dispatcher.register("save_home", params -> app.callOnEdt(() -> {
      requireUi(app);
      String path = string(params, "path");
      new HomeFileRecorder(9).writeHome(app.home(), path);
      JsonObject data = new JsonObject();
      data.addProperty("path", path);
      data.addProperty("walls", app.home().getWalls().size());
      return data;
    }));

    // File IO happens on the request thread; only the home swap needs the EDT.
    dispatcher.register("open_home", params -> {
      String path = string(params, "path");
      Home loaded = new HomeFileRecorder(9).readHome(path);
      app.openHomeOnEdt(loaded);
      JsonObject data = new JsonObject();
      data.addProperty("path", path);
      data.addProperty("walls", loaded.getWalls().size());
      return data;
    });
  }

  private static BufferedImage renderPlan(Sh3dApplication app, int width, int height) {
    PlanComponent plan = new PlanComponent(app.home(), app.getUserPreferences(), null);
    plan.setSize(width, height);
    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    Graphics2D graphics = image.createGraphics();
    try {
      graphics.setColor(java.awt.Color.WHITE);
      graphics.fillRect(0, 0, width, height);
      plan.printAll(graphics);
    } finally {
      graphics.dispose();
    }
    return image;
  }

  private static JsonObject writePng(BufferedImage image, int width, int height, String path)
      throws Exception {
    File file = new File(path);
    File parent = file.getAbsoluteFile().getParentFile();
    if (parent != null) {
      Files.createDirectories(parent.toPath());
    }
    ByteArrayOutputStream png = new ByteArrayOutputStream();
    ImageIO.write(image, "png", png);
    Files.write(file.toPath(), png.toByteArray());

    JsonObject data = new JsonObject();
    data.addProperty("path", path);
    data.addProperty("width", width);
    data.addProperty("height", height);
    data.addProperty("bytes", png.size());
    data.addProperty("sha256", sha256Hex(png.toByteArray()));
    return data;
  }

  private static String sha256Hex(byte[] bytes) throws Exception {
    StringBuilder hex = new StringBuilder();
    for (byte b : MessageDigest.getInstance("SHA-256").digest(bytes)) {
      hex.append(String.format("%02x", b));
    }
    return hex.toString();
  }

  private static void requireUi(Sh3dApplication app) {
    if (!app.isUiReady()) {
      throw new IllegalStateException("UI not booted yet");
    }
  }

  private static String string(JsonObject params, String name) {
    JsonElement el = params.get(name);
    if (el == null || !el.isJsonPrimitive() || !el.getAsJsonPrimitive().isString()) {
      throw new IllegalArgumentException("missing or non-string param: " + name);
    }
    return el.getAsString();
  }

  private static Size size(JsonObject params) {
    int width = intParam(params, "width");
    int height = intParam(params, "height");
    if (width < 1 || width > 4096 || height < 1 || height > 4096) {
      throw new IllegalArgumentException("width/height must be within [1,4096]");
    }
    return new Size(width, height);
  }

  private static int intParam(JsonObject params, String name) {
    JsonElement el = params.get(name);
    if (el == null || !el.isJsonPrimitive() || !el.getAsJsonPrimitive().isNumber()) {
      throw new IllegalArgumentException("missing or non-number param: " + name);
    }
    return el.getAsInt();
  }

  private record Size(int width, int height) {
  }
}
