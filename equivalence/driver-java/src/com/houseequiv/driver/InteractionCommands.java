package com.houseequiv.driver;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.houseequiv.driver.protocol.Dispatcher;
import com.eteks.sweethome3d.model.CatalogPieceOfFurniture;
import com.eteks.sweethome3d.model.FurnitureCatalog;
import com.eteks.sweethome3d.model.FurnitureCategory;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.HomePieceOfFurniture;
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
      PlanController pc = plan(app);
      float x = reqFloat(params, "x");
      float y = reqFloat(params, "y");
      if (optBool(params, "dbl", false)) {
        // ws-protocol v1: click{dbl:true} == double-click (press count 2 +
        // release, no fresh moveMouse) — same semantics as homely's engine.
        pc.pressMouse(x, y, 2, optBool(params, "shift", false),
            optBool(params, "duplication", false));
        pc.releaseMouse(x, y);
      } else {
        clickAt(pc, x, y, 1,
            optBool(params, "shift", false), optBool(params, "duplication", false));
      }
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

    // A5: expose SH3D's real furniture catalog over the wire.
    dispatcher.register("list_catalog", params -> app.callOnEdt(() -> {
      JsonArray items = new JsonArray();
      FurnitureCatalog catalog = app.getUserPreferences().getFurnitureCatalog();
      for (FurnitureCategory category : catalog.getCategories()) {
        // Top-level categories only; subcategories are not modelled in SH3D 7.5.
        for (CatalogPieceOfFurniture piece : category.getFurniture()) {
          JsonObject item = new JsonObject();
          item.addProperty("catalogId", piece.getId());
          item.addProperty("name", piece.getName());
          item.addProperty("width", round3(piece.getWidth()));
          item.addProperty("depth", round3(piece.getDepth()));
          item.addProperty("height", round3(piece.getHeight()));
          item.addProperty("elevation", round3(piece.getElevation()));
          item.addProperty("doorOrWindow", piece.isDoorOrWindow());
          items.add(item);
        }
      }
      JsonObject data = new JsonObject();
      data.add("items", items);
      return data;
    }));

    dispatcher.register("add_furniture", params -> app.callOnEdt(() -> {
      String catalogId = string(params, "catalogId");
      float x = reqFloat(params, "x");
      float y = reqFloat(params, "y");
      CatalogPieceOfFurniture catalogItem = findCatalogPiece(app, catalogId);
      if (catalogItem == null) {
        throw new IllegalArgumentException("unknown catalogId: " + catalogId);
      }
      HomePieceOfFurniture piece = new HomePieceOfFurniture(catalogItem);
      // Catalog id is carried on CatalogPieceOfFurniture.getId(), not copied by
      // the PieceOfFurniture ctor, so set it explicitly for state export.
      piece.setCatalogId(catalogItem.getId());
      piece.setX(x);
      piece.setY(y);
      if (params.has("angleDeg") && !params.get("angleDeg").isJsonNull()) {
        piece.setAngle((float) (reqFloat(params, "angleDeg") * Math.PI / 180.0));
      }
      home(app).addPieceOfFurniture(piece);
      JsonObject data = new JsonObject();
      data.addProperty("objectId", app.ids().idFor(piece, "furniture"));
      return data;
    }));

    // Full NormalizedHomeState export per docs/schema/home-project.schema.json v1 (A3).
    dispatcher.register("get_state", params -> app.callOnEdt(() -> buildState(app)));
  }

  private static JsonObject buildState(Sh3dApplication app) {
    requireUi(app);
    Home home = home(app);
    IdAssigner ids = app.ids();

    JsonObject state = new JsonObject();
    state.addProperty("schemaVersion", 1);
    state.add("name", home.getName() == null
        ? JsonNull.INSTANCE : new JsonPrimitive(home.getName()));

    java.util.Map<com.eteks.sweethome3d.model.Level, String> levelIds =
        new java.util.IdentityHashMap<>();
    JsonArray levels = new JsonArray();
    for (com.eteks.sweethome3d.model.Level l : home.getLevels()) {
      String id = ids.idFor(l, "level");
      levelIds.put(l, id);
      JsonObject o = new JsonObject();
      o.addProperty("id", id);
      o.addProperty("name", l.getName());
      o.addProperty("elevation", round3(l.getElevation()));
      o.addProperty("floorThickness", round3(l.getFloorThickness()));
      o.addProperty("height", round3(l.getHeight()));
      o.addProperty("visible", l.isVisible());
      o.addProperty("viewable", l.isViewable());
      levels.add(o);
    }
    state.add("levels", levels);

    JsonArray walls = new JsonArray();
    for (Wall w : home.getWalls()) {
      JsonObject wall = new JsonObject();
      wall.addProperty("id", ids.idFor(w, "wall"));
      wall.addProperty("xStart", round3(w.getXStart()));
      wall.addProperty("yStart", round3(w.getYStart()));
      wall.addProperty("xEnd", round3(w.getXEnd()));
      wall.addProperty("yEnd", round3(w.getYEnd()));
      wall.add("arcExtent", w.getArcExtent() == null
          ? JsonNull.INSTANCE : new JsonPrimitive(round3(w.getArcExtent())));
      wall.addProperty("thickness", round3(w.getThickness()));
      wall.add("height", w.getHeight() == null
          ? JsonNull.INSTANCE : new JsonPrimitive(round3(w.getHeight())));
      wall.add("heightAtEnd", w.getHeightAtEnd() == null
          ? JsonNull.INSTANCE : new JsonPrimitive(round3(w.getHeightAtEnd())));
      wall.add("levelRef", ref(levelIds, w.getLevel()));
      wall.add("leftSideColor", colorRef(w.getLeftSideColor()));
      wall.add("rightSideColor", colorRef(w.getRightSideColor()));
      wall.add("patternId", w.getPattern() == null
          ? JsonNull.INSTANCE : new JsonPrimitive(w.getPattern().getName()));
      walls.add(wall);
    }
    state.add("walls", walls);

    JsonArray rooms = new JsonArray();
    for (com.eteks.sweethome3d.model.Room r : home.getRooms()) {
      JsonObject room = new JsonObject();
      room.addProperty("id", ids.idFor(r, "room"));
      room.add("name", r.getName() == null
          ? JsonNull.INSTANCE : new JsonPrimitive(r.getName()));
      JsonArray points = new JsonArray();
      for (float[] p : r.getPoints()) {
        JsonArray pt = new JsonArray();
        pt.add(round3(p[0]));
        pt.add(round3(p[1]));
        points.add(pt);
      }
      room.add("points", points);
      room.addProperty("areaVisible", r.isAreaVisible());
      room.addProperty("floorVisible", r.isFloorVisible());
      room.add("floorColor", colorRef(r.getFloorColor()));
      room.addProperty("ceilingVisible", r.isCeilingVisible());
      room.add("levelRef", ref(levelIds, r.getLevel()));
      rooms.add(room);
    }
    state.add("rooms", rooms);

    JsonArray furniture = new JsonArray();
    for (com.eteks.sweethome3d.model.HomePieceOfFurniture p : home.getFurniture()) {
      JsonObject f = new JsonObject();
      f.addProperty("id", ids.idFor(p, "furniture"));
      f.add("catalogId", p.getCatalogId() == null
          ? JsonNull.INSTANCE : new JsonPrimitive(p.getCatalogId()));
      f.addProperty("name", p.getName());
      f.addProperty("x", round3(p.getX()));
      f.addProperty("y", round3(p.getY()));
      f.addProperty("elevation", round3(p.getElevation()));
      f.addProperty("angleDeg", toDeg(p.getAngle()));
      f.addProperty("pitchDeg", toDeg(p.getPitch()));
      f.addProperty("rollDeg", toDeg(p.getRoll()));
      f.addProperty("width", round3(p.getWidth()));
      f.addProperty("depth", round3(p.getDepth()));
      f.addProperty("height", round3(p.getHeight()));
      f.add("color", colorRef(p.getColor()));
      f.addProperty("visible", p.isVisible());
      f.addProperty("movable", p.isMovable());
      f.addProperty("doorOrWindow",
          p instanceof com.eteks.sweethome3d.model.DoorOrWindow);
      float[][] rot = p.getModelRotation();
      if (rot != null) {
        JsonArray rows = new JsonArray();
        for (float[] row : rot) {
          JsonArray r2 = new JsonArray();
          for (float v : row) {
            r2.add(round3(v));
          }
          rows.add(r2);
        }
        f.add("modelRotationDeg", rows);
      }
      f.add("levelRef", ref(levelIds, p.getLevel()));
      furniture.add(f);
    }
    state.add("furniture", furniture);

    JsonArray dimensionLines = new JsonArray();
    for (com.eteks.sweethome3d.model.DimensionLine d : home.getDimensionLines()) {
      JsonObject o = new JsonObject();
      o.addProperty("id", ids.idFor(d, "dimline"));
      o.addProperty("xStart", round3(d.getXStart()));
      o.addProperty("yStart", round3(d.getYStart()));
      o.addProperty("xEnd", round3(d.getXEnd()));
      o.addProperty("yEnd", round3(d.getYEnd()));
      o.addProperty("offset", round3(d.getOffset()));
      o.addProperty("elevationStart", round3(d.getElevationStart()));
      o.addProperty("elevationEnd", round3(d.getElevationEnd()));
      o.add("levelRef", ref(levelIds, d.getLevel()));
      dimensionLines.add(o);
    }
    state.add("dimensionLines", dimensionLines);

    JsonArray labels = new JsonArray();
    for (com.eteks.sweethome3d.model.Label lb : home.getLabels()) {
      JsonObject o = new JsonObject();
      o.addProperty("id", ids.idFor(lb, "label"));
      o.addProperty("text", lb.getText());
      o.addProperty("x", round3(lb.getX()));
      o.addProperty("y", round3(lb.getY()));
      o.addProperty("angleDeg", toDeg(lb.getAngle()));
      o.addProperty("elevation", round3(lb.getElevation()));
      o.add("color", colorRef(lb.getColor()));
      o.add("levelRef", ref(levelIds, lb.getLevel()));
      labels.add(o);
    }
    state.add("labels", labels);

    com.eteks.sweethome3d.model.Compass compass = home.getCompass();
    JsonObject c = new JsonObject();
    c.addProperty("x", round3(compass.getX()));
    c.addProperty("y", round3(compass.getY()));
    c.addProperty("diameter", round3(compass.getDiameter()));
    c.addProperty("northDirectionDeg", toDeg(compass.getNorthDirection()));
    c.addProperty("latitudeRad", round3(compass.getLatitude()));
    c.addProperty("longitudeRad", round3(compass.getLongitude()));
    c.addProperty("visible", compass.isVisible());
    state.add("compass", c);

    JsonObject cameras = new JsonObject();
    cameras.add("top", cameraJson(ids, home.getTopCamera(), "camera-top"));
    com.eteks.sweethome3d.model.ObserverCamera obs = home.getObserverCamera();
    JsonObject oc = cameraJson(ids, obs, "camera-observer");
    oc.addProperty("fixedSize", obs.isFixedSize());
    cameras.add("observer", oc);
    state.add("cameras", cameras);

    com.eteks.sweethome3d.model.HomeEnvironment env = home.getEnvironment();
    JsonObject e = new JsonObject();
    e.addProperty("skyColor", env.getSkyColor());
    e.addProperty("groundColor", env.getGroundColor());
    e.addProperty("lightColor", env.getLightColor());
    e.addProperty("wallsAlpha", round3(env.getWallsAlpha()));
    state.add("environment", e);

    JsonArray selection = new JsonArray();
    for (Selectable s : home.getSelectedItems()) {
      selection.add(new JsonPrimitive(selectableId(ids, s)));
    }
    state.add("selection", selection);
    state.add("activeTool", activeToolJson(plan(app).getMode()));

    JsonObject caps = new JsonObject();
    caps.addProperty("canUndo", undoManagerOf(app).canUndo());
    caps.addProperty("canRedo", undoManagerOf(app).canRedo());
    state.add("capabilities", caps);
    return state;
  }

  private static JsonObject cameraJson(IdAssigner ids,
                                       com.eteks.sweethome3d.model.Camera cam,
                                       String id) {
    JsonObject o = new JsonObject();
    o.addProperty("id", ids.idFor(cam, id));
    o.addProperty("x", round3(cam.getX()));
    o.addProperty("y", round3(cam.getY()));
    o.addProperty("z", round3(cam.getZ()));
    o.addProperty("yawDeg", toDeg(cam.getYaw()));
    o.addProperty("pitchDeg", toDeg(cam.getPitch()));
    o.addProperty("fovDeg", round3((float) Math.toDegrees(cam.getFieldOfView())));
    if (cam.getLens() != null) {
      o.addProperty("lens", cam.getLens().name());
    }
    return o;
  }

  private static String selectableId(IdAssigner ids, Selectable s) {
    if (s instanceof Wall) return ids.idFor(s, "wall");
    if (s instanceof com.eteks.sweethome3d.model.Room) return ids.idFor(s, "room");
    if (s instanceof com.eteks.sweethome3d.model.DimensionLine) return ids.idFor(s, "dimline");
    if (s instanceof com.eteks.sweethome3d.model.Label) return ids.idFor(s, "label");
    if (s instanceof com.eteks.sweethome3d.model.Compass) return ids.idFor(s, "compass");
    if (s instanceof com.eteks.sweethome3d.model.Camera) return ids.idFor(s, "camera");
    return ids.idFor(s, "item");
  }

  private static JsonElement ref(java.util.Map<com.eteks.sweethome3d.model.Level, String> levelIds,
                                 com.eteks.sweethome3d.model.Level level) {
    if (level == null || !levelIds.containsKey(level)) {
      return JsonNull.INSTANCE;
    }
    return new JsonPrimitive(levelIds.get(level));
  }

  private static JsonElement colorRef(Integer color) {
    return color == null ? JsonNull.INSTANCE : new JsonPrimitive(color.intValue());
  }

  private static JsonElement activeToolJson(PlanController.Mode mode) {
    if (mode == null) {
      return JsonNull.INSTANCE;
    }
    switch (mode.name()) {
      case "SELECTION": return new JsonPrimitive("selection");
      case "PANNING": return new JsonPrimitive("panning");
      case "WALL_CREATION": return new JsonPrimitive("wall");
      case "ROOM_CREATION": return new JsonPrimitive("room");
      case "POLYLINE_CREATION": return new JsonPrimitive("polyline");
      case "DIMENSION_LINE_CREATION": return new JsonPrimitive("dimensionLine");
      case "LABEL_CREATION": return new JsonPrimitive("label");
      default: return JsonNull.INSTANCE;
    }
  }

  /** Degrees from radians, normalized to (-180, 180], rounded to 3 decimals. */
  private static double toDeg(float radians) {
    double d = Math.toDegrees(radians) % 360.0;
    if (d <= -180.0) {
      d += 360.0;
    } else if (d > 180.0) {
      d -= 360.0;
    }
    return BigDecimal.valueOf(d).setScale(3, RoundingMode.HALF_EVEN).doubleValue();
  }

  private static final java.lang.reflect.Field UNDO_MANAGER_FIELD;
  static {
    try {
      UNDO_MANAGER_FIELD =
          com.eteks.sweethome3d.viewcontroller.HomeController.class.getDeclaredField("undoManager");
      UNDO_MANAGER_FIELD.setAccessible(true);
    } catch (NoSuchFieldException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  private static javax.swing.undo.UndoManager undoManagerOf(Sh3dApplication app) {
    try {
      return (javax.swing.undo.UndoManager) UNDO_MANAGER_FIELD.get(homeController(app));
    } catch (IllegalAccessException e) {
      throw new IllegalStateException("cannot read undo manager", e);
    }
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

  /** Scans the SH3D furniture catalog for a {@code CatalogPieceOfFurniture} by id. */
  private static CatalogPieceOfFurniture findCatalogPiece(Sh3dApplication app, String catalogId) {
    FurnitureCatalog catalog = app.getUserPreferences().getFurnitureCatalog();
    for (FurnitureCategory category : catalog.getCategories()) {
      for (CatalogPieceOfFurniture piece : category.getFurniture()) {
        if (catalogId.equals(piece.getId())) {
          return piece;
        }
      }
    }
    return null;
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
      // ws-protocol v1 tool names first, then driver aliases.
      case "wall_creation", "wall", "walls": return PlanController.Mode.WALL_CREATION;
      case "room_creation", "room", "rooms": return PlanController.Mode.ROOM_CREATION;
      case "polyline_creation", "polyline": return PlanController.Mode.POLYLINE_CREATION;
      case "dimension_line_creation", "dimension_line", "dimensionLine":
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
