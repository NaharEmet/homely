package com.houseequiv.driver.protocol;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.houseequiv.driver.Sh3dApplication;

import java.util.ArrayList;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Maps request type -> handler and produces the single framed response line
 * required by docs/specs/ws-protocol.md v1:
 *   {"id":<echo>,"ok":true,"data":{...}}
 *   {"id":<echo>,"ok":false,"error":"...","code":"UNKNOWN_COMMAND|BAD_REQUEST|INTERNAL"}
 */
public final class Dispatcher {

  @FunctionalInterface
  public interface Handler {
    JsonObject handle(JsonObject params) throws Exception;
  }

  private final Sh3dApplication app;
  private final SortedMap<String, Handler> handlers = new TreeMap<>();

  public Dispatcher(Sh3dApplication app) {
    this.app = app;
    handlers.put("ping", params -> {
      JsonObject data = new JsonObject();
      data.addProperty("pong", true);
      return data;
    });
    handlers.put("new_home", params -> {
      if (!app.isUiReady()) {
        throw new IllegalStateException("UI not booted yet");
      }
      app.newHomeOnEdt();
      return new JsonObject();
    });
    handlers.put("get_capabilities", params -> {
      JsonArray commands = new JsonArray();
      for (String name : handlers.keySet()) {
        commands.add(name);
      }
      JsonObject data = new JsonObject();
      data.add("commands", commands);
      return data;
    });
  }

  /** Registers an additional command handler; last registration wins. */
  public void register(String type, Handler handler) {
    handlers.put(type, handler);
  }

  /** Handles one raw JSON line; always returns exactly one response object string. */
  String handle(String line) {
    JsonElement id = null;
    try {
      JsonElement parsed;
      try {
        parsed = JsonParser.parseString(line);
      } catch (JsonParseException e) {
        return errorJson(null, "BAD_REQUEST", "malformed JSON: " + e.getMessage());
      }
      if (!parsed.isJsonObject()) {
        return errorJson(null, "BAD_REQUEST", "request is not a JSON object");
      }
      JsonObject req = parsed.getAsJsonObject();

      id = req.get("id");
      JsonElement typeEl = req.get("type");
      if (typeEl == null || !typeEl.isJsonPrimitive() || !typeEl.getAsJsonPrimitive().isString()) {
        return errorJson(id, "BAD_REQUEST", "missing or non-string \"type\"");
      }
      String type = typeEl.getAsString();

      JsonElement paramsEl = req.get("params");
      JsonObject params = paramsEl != null && paramsEl.isJsonObject()
          ? paramsEl.getAsJsonObject()
          : new JsonObject();

      Handler handler = handlers.get(type);
      if (handler == null) {
        return errorJson(id, "UNKNOWN_COMMAND", "unknown command: " + type);
      }

      JsonObject data = handler.handle(params);
      JsonObject ok = new JsonObject();
      ok.add("id", id == null ? null : id);
      ok.addProperty("ok", true);
      ok.add("data", data);
      return ok.toString();
    } catch (Exception e) {
      return errorJson(id, "INTERNAL", e.getClass().getSimpleName() + ": " + e.getMessage());
    }
  }

  List<String> commandNames() {
    return new ArrayList<>(handlers.keySet());
  }

  private static String errorJson(JsonElement id, String code, String message) {
    JsonObject err = new JsonObject();
    err.add("id", id == null ? null : id);
    err.addProperty("ok", false);
    err.addProperty("error", message);
    err.addProperty("code", code);
    return err.toString();
  }
}
