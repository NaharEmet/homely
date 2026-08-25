package com.houseequiv.driver;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.houseequiv.driver.protocol.Dispatcher;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.Selectable;
import com.eteks.sweethome3d.model.Wall;
import com.eteks.sweethome3d.viewcontroller.PlanController;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;

/**
 * A2 interaction commands: scripted mouse/keyboard driving of the real plan
 * controller in model centimeter coordinates, plus a minimal get_state that
 * exposes walls (full NormalizedHomeState export is ticket A3).
 *
 * All handlers marshal onto the EDT via Sh3dApplication.callOnEdt.
 */
public final class InteractionCommands {

  private InteractionCommands() {
  }

  public static void register(Dispatcher dispatcher, Sh3dApplication app) {
    dispatcher.register("select_tool", params -> app.callOnEdt(() -> {
      String tool = string(params, "tool");
      plan(app).setMode(modeFor(tool));
      return new JsonObject();
    }));

    dispatcher.register("press_mouse", params -> app.callOnEdt(() -> {
      float x = reqFloat(params, "x");
      float y = reqFloat(params, "y");
      int clicks = optInt(params, "click_count", 1);
      boolean shift = optBool(params, "shift", false);
      boolean duplication = optBool(params, "duplication", false);
      plan(app).pressMouse(x, y, clicks, shift, duplication);
      return new JsonObject();
    }));

    dispatcher.register("move_mouse", params -> app.callOnEdt(() -> {
      plan(app).moveMouse(reqFloat(params, "x"), reqFloat(params, "y"));
      return new JsonObject();
    }));

    dispatcher.register("release_mouse", params -> app.callOnEdt(() -> {
      plan(app).releaseMouse(reqFloat(params, "x"), reqFloat(params, "y"));
      return new JsonObject();
    }));

    dispatcher.register("click", params -> app.callOnEdt(() -> {
      clickAt(plan(app), reqFloat(params, "x"), reqFloat(params, "y"), 1,
          optBool(params, "shift", false), optBool(params, "duplication", false));
      return new JsonObject();
    }));

    dispatcher.register("double_click", params -> app.callOnEdt(() -> {
      // A true double-click event pair: second physical press arrives with
      // clickCount=2 and NO fresh moveMouse before it. In wall mode this
      // closes/joins the chain exactly like a user double-click (the join
      // targets were computed during the preceding click's moveMouse).
      PlanController pc = plan(app);
      float x = reqFloat(params, "x");
      float y = reqFloat(params, "y");
      pc.pressMouse(x, y, 2, optBool(params, "shift", false),
          optBool(params, "duplication", false));
      pc.releaseMouse(x, y);
      return new JsonObject();
    }));

    dispatcher.register("key", params -> app.callOnEdt(() -> {
      String key = string(params, "key");
      PlanController pc = plan(app);
      switch (key) {
        case "escape" -> pc.escape();
        case "delete", "backspace" -> {
          unselectCompass(app);
          pc.deleteSelection();
        }
        default -> throw new IllegalArgumentException(
            "unsupported key: " + key + " (expected escape|delete|backspace)");
      }
      return new JsonObject();
    }));

    dispatcher.register("set_magnetism", params -> app.callOnEdt(() -> {
      JsonElement enabled = params.get("enabled");
      if (enabled == null || !enabled.isJsonPrimitive()) {
        throw new IllegalArgumentException("missing required param: enabled");
      }
      app.getUserPreferences().setMagnetismEnabled(enabled.getAsBoolean());
      JsonObject data = new JsonObject();
      data.addProperty("enabled", enabled.getAsBoolean());
      return data;
    }));

    dispatcher.register("undo", params -> app.callOnEdt(() -> {
      homeController(app).undo();
      return new JsonObject();
    }));

    dispatcher.register("redo", params -> app.callOnEdt(() -> {
      homeController(app).redo();
      return new JsonObject();
    }));

    dispatcher.register("delete_selection", params -> app.callOnEdt(() -> {
      unselectCompass(app);
      plan(app).deleteSelection();
      return new JsonObject();
    }));

    dispatcher.register("select_all", params -> app.callOnEdt(() -> {
      // PlanController.selectAll() directly: HomeController.selectAll()
      // no-ops unless a Swing view holds focus, which synthetic driving
      // cannot guarantee.
      plan(app).selectAll();
      return new JsonObject();
    }));

    dispatcher.register("clear_selection", params -> app.callOnEdt(() -> {
      home(app).setSelectedItems(Collections.<Selectable>emptyList());
      return new JsonObject();
    }));

    // Copy/paste use a deterministic driver-side clipboard instead of the
    // Swing transfer handler (which HomePane only wires in its own boot path).
    // Items are stored Java-serialized (like SH3D's HomeTransferableList) so
    // paste always inserts DEEP COPIES — handing controller.paste live
    // references re-adds the very objects still in the home, aliasing them
    // and corrupting undo semantics.
    // controller.paste(items) is exactly what PlanTransferHandler.importData
    // ends up calling, so semantics match the real app.
    dispatcher.register("copy_selection", params -> app.callOnEdt(() -> {
      java.util.List<Selectable> items = new java.util.ArrayList<>(home(app).getSelectedItems());
      if (items.isEmpty()) {
        throw new IllegalArgumentException("nothing selected to copy");
      }
      app.setClipboardBytes(freeze(items));
      JsonObject data = new JsonObject();
      data.addProperty("copied", items.size());
      return data;
    }));

    dispatcher.register("cut_selection", params -> app.callOnEdt(() -> {
      java.util.List<Selectable> items = new java.util.ArrayList<>(home(app).getSelectedItems());
      if (items.isEmpty()) {
        throw new IllegalArgumentException("nothing selected to cut");
      }
      app.setClipboardBytes(freeze(items));
      homeController(app).cut(items);
      JsonObject data = new JsonObject();
      data.addProperty("cut", items.size());
      return data;
    }));

    dispatcher.register("paste", params -> app.callOnEdt(() -> {
      byte[] bytes = app.clipboardBytes();
      if (bytes == null || bytes.length == 0) {
        throw new IllegalArgumentException("clipboard is empty");
      }
      homeController(app).paste(new java.util.ArrayList<>(thaw(bytes)));
      JsonObject data = new JsonObject();
      data.addProperty("pasted", thawCount(bytes));
      return data;
    }));

    // Debug-only helper (not part of the equivalence protocol surface):
    // paints the live frame into a PNG so a human can eyeball driver-driven
    // UI state. Deterministic offscreen renders are ticket A4's job.
    dispatcher.register("debug_screenshot", params -> app.callOnEdt(() -> {
      String path = string(params, "path");
      java.awt.Window window = javax.swing.SwingUtilities.getWindowAncestor(
          (java.awt.Component) app.frameController().getView());
      if (window == null) {
        throw new IllegalStateException("no window displayed");
      }
      java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(
          window.getWidth(), window.getHeight(), java.awt.image.BufferedImage.TYPE_INT_RGB);
      java.awt.Graphics2D g = image.createGraphics();
      window.printAll(g);
      g.dispose();
      if (!javax.imageio.ImageIO.write(image, "png", new java.io.File(path))) {
        throw new IllegalStateException("no png writer for " + path);
      }
      JsonObject data = new JsonObject();
      data.addProperty("path", path);
      data.addProperty("width", image.getWidth());
      data.addProperty("height", image.getHeight());
      return data;
    }));

    // Minimal state read (A2 DoD): walls with driver-assigned ids.
    // Full NormalizedHomeState export per docs/schema is ticket A3.
    dispatcher.register("get_state", params -> app.callOnEdt(() -> {
      Home home = home(app);
      IdAssigner ids = app.ids();
      JsonObject data = new JsonObject();

      JsonArray walls = new JsonArray();
      for (Wall w : home.getWalls()) {
        JsonObject wall = new JsonObject();
        wall.addProperty("id", ids.idFor(w, "wall"));
        wall.addProperty("x_start", round3(w.getXStart()));
        wall.addProperty("y_start", round3(w.getYStart()));
        wall.addProperty("x_end", round3(w.getXEnd()));
        wall.addProperty("y_end", round3(w.getYEnd()));
        wall.add("height", w.getHeight() == null
            ? JsonNull.INSTANCE : new JsonPrimitive(round3(w.getHeight())));
        wall.add("height_at_end", w.getHeightAtEnd() == null
            ? JsonNull.INSTANCE : new JsonPrimitive(round3(w.getHeightAtEnd())));
        wall.addProperty("thickness", round3(w.getThickness()));
        walls.add(wall);
      }
      data.add("walls", walls);

      JsonArray selection = new JsonArray();
      for (Selectable s : home.getSelectedItems()) {
        if (s instanceof Wall) {
          selection.add(ids.idFor(s, "wall"));
        } else {
          selection.add(ids.idFor(s, "item"));
        }
      }
      data.add("selection", selection);
      return data;
    }));
  }

  /**
   * Drops the compass from the current selection. select_all picks it up,
   * and deleting it crashes our boot path's 3D branch sync
   * (Object3DBranch NPE), so delete operations must never see it.
   */
  private static void unselectCompass(Sh3dApplication app) {
    Home home = home(app);
    java.util.List<Selectable> filtered = new java.util.ArrayList<>();
    boolean changed = false;
    for (Selectable s : home.getSelectedItems()) {
      if (s instanceof com.eteks.sweethome3d.model.Compass) {
        changed = true;
      } else {
        filtered.add(s);
      }
    }
    if (changed) {
      home.setSelectedItems(filtered);
    }
  }

  private static void clickAt(PlanController pc, float x, float y, int clicks,
                              boolean shift, boolean duplication) {
    pc.moveMouse(x, y);
    pc.pressMouse(x, y, 1, shift, duplication);
    pc.releaseMouse(x, y);
    if (clicks == 2) {
      pc.pressMouse(x, y, 2, shift, duplication);
      pc.releaseMouse(x, y);
    }
  }

  private static PlanController.Mode modeFor(String tool) {
    switch (tool) {
      case "selection": return PlanController.Mode.SELECTION;
      case "panning": return PlanController.Mode.PANNING;
      case "wall_creation", "walls": return PlanController.Mode.WALL_CREATION;
      case "room_creation", "rooms": return PlanController.Mode.ROOM_CREATION;
      case "polyline_creation", "polyline": return PlanController.Mode.POLYLINE_CREATION;
      case "dimension_line_creation", "dimension_line":
        return PlanController.Mode.DIMENSION_LINE_CREATION;
      case "label_creation", "label": return PlanController.Mode.LABEL_CREATION;
      default:
        throw new IllegalArgumentException("unknown tool: " + tool);
    }
  }

  static PlanController plan(Sh3dApplication app) {
    requireUi(app);
    return homeController(app).getPlanController();
  }

  static Home home(Sh3dApplication app) {
    requireUi(app);
    Home h = app.home();
    if (h == null) {
      throw new IllegalStateException("no home booted yet");
    }
    return h;
  }

  private static com.eteks.sweethome3d.viewcontroller.HomeController homeController(
      Sh3dApplication app) {
    requireUi(app);
    return app.frameController().getHomeController();
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

  private static float reqFloat(JsonObject params, String name) {
    JsonElement el = params.get(name);
    if (el == null || !el.isJsonPrimitive() || !el.getAsJsonPrimitive().isNumber()) {
      throw new IllegalArgumentException("missing or non-number param: " + name);
    }
    return el.getAsFloat();
  }

  private static int optInt(JsonObject params, String name, int fallback) {
    JsonElement el = params.get(name);
    return el != null && el.isJsonPrimitive() && el.getAsJsonPrimitive().isNumber()
        ? el.getAsInt() : fallback;
  }

  private static boolean optBool(JsonObject params, String name, boolean fallback) {
    JsonElement el = params.get(name);
    return el != null && el.isJsonPrimitive() && el.getAsJsonPrimitive().isBoolean()
        ? el.getAsBoolean() : fallback;
  }

  private static float round3(float v) {
    return BigDecimal.valueOf(v).setScale(3, RoundingMode.HALF_EVEN).floatValue();
  }

  /** Serializes items to bytes (deep-copy snapshot, mirrors HomeTransferableList transfer data). */
  private static byte[] freeze(java.util.List<Selectable> items) {
    try {
      java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
      try (java.io.ObjectOutputStream oos = new java.io.ObjectOutputStream(bos)) {
        oos.writeObject(items);
      }
      return bos.toByteArray();
    } catch (java.io.IOException e) {
      throw new RuntimeException("clipboard freeze failed: " + e, e);
    }
  }

  @SuppressWarnings("unchecked")
  private static java.util.List<Selectable> thaw(byte[] bytes) {
    try {
      try (java.io.ObjectInputStream ois =
          new java.io.ObjectInputStream(new java.io.ByteArrayInputStream(bytes))) {
        return (java.util.List<Selectable>) ois.readObject();
      }
    } catch (java.io.IOException | ClassNotFoundException e) {
      throw new RuntimeException("clipboard thaw failed: " + e, e);
    }
  }

  private static int thawCount(byte[] bytes) {
    return thaw(bytes).size();
  }
}
