package com.houseequiv.driver;

import java.util.HashMap;
import java.util.Map;
import java.util.WeakHashMap;

/**
 * Assigns stable sequential ids ("wall-1", "wall-2", ...) to SH3D model
 * objects. SH3D has no object identity in its model, so the driver mints ids
 * on first sight; WeakHashMap keeps them alive while the object is. Reset on
 * boot / new_home so ids restart from 1 for each fresh home — this aligns
 * with the orchestrator's creation-order ledger matching.
 */
public final class IdAssigner {

  private final Map<Object, String> byObject = new WeakHashMap<>();
  private final Map<String, Integer> counters = new HashMap<>();

  /** Returns the id previously assigned to o, or mints prefix-N. */
  public String idFor(Object o, String prefix) {
    String existing = byObject.get(o);
    if (existing != null) {
      return existing;
    }
    int n = counters.merge(prefix, 1, Integer::sum);
    String id = prefix + "-" + n;
    byObject.put(o, id);
    return id;
  }

  public void reset() {
    byObject.clear();
    counters.clear();
  }
}
