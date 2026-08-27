# Wall Rendering/Editing UX & Auto Flooring — Improvement Plan

## Overview

Three interconnected improvements to the SweetHome3D Wayland fork:
1. **Auto-Floor Generation from Walls** — detect closed wall loops, auto-create Room polygons
2. **Wall Drawing UX Polish** — closed-loop preview, snapping improvements
3. **Floor Auto-Materials** — auto-apply default floor textures on room creation

---

## 1. Auto-Floor Generation from Walls

### Problem
Users must manually draw Room polygons that duplicate wall boundaries. Walls and Rooms are completely independent — no algorithm derives a room from a closed wall loop.

### Solution: Wall Loop Detector + Inner Polygon Extractor

#### 1.1 Detect Closed Wall Loops

**New class: `WallLoopDetector`**
Location: `src/com/eteks/sweethome3d/model/WallLoopDetector.java`

Algorithm:
1. Build an adjacency graph from all walls at the current level.
2. Each wall has two endpoints: `(xStart,yStart)` and `(xEnd,yEnd)`.
3. For each endpoint, find all other walls that share that point (within tolerance ~0.01).
4. Find cycles in the graph using DFS/BFS from each unvisited node.
5. A "closed loop" = a cycle where every node has degree 2 (no T-junctions branching off).
6. Filter: only loops with ≥3 walls (minimum triangle).

Key data structures:
```java
// Graph node = wall endpoint (shared point between walls)
// Graph edge = wall segment
// A closed loop = a cycle in this graph where all nodes have degree 2

Map<Point2D, List<Wall>> endpointToWalls;  // point → walls connected there
Map<Wall, Wall[]> wallNeighbors;           // wall → [wall at start, wall at end]
```

**Endpoint matching**: Use `Wall.getPoints()` to get the 4 corner points. The "start" endpoint is the midpoint of points [0] and [3] (left-start, right-start). The "end" endpoint is the midpoint of points [1] and [2] (left-end, right-end). Match endpoints within 0.01 tolerance.

**Alternative approach (simpler)**: Use the existing `wallAtStart`/`wallAtEnd` linked list in Wall.java. Follow the chain:
- Start from any wall with `wallAtStart == null` (free start) or `wallAtEnd == null` (free end).
- Follow the chain: `wall.wallAtEnd → next.wallAtEnd → ...`
- If the chain returns to the starting wall, it's a closed loop.
- Limitation: this only works for walls explicitly joined via the UI. Walls that happen to meet at the same point but weren't joined won't be detected.

**Recommended**: Use the geometric approach (endpoint matching) for robustness, but fall back to the `wallAtStart`/`wallAtEnd` chain for performance.

#### 1.2 Extract Inner Polygon from Wall Loop

For a closed loop of N walls, the inner polygon is the region enclosed by the walls' inner edges.

**Algorithm**:
1. For each wall in the loop, get its 4 corner points via `wall.getPoints()`.
2. Determine the wall's orientation relative to the loop center:
   - Compute the loop centroid (average of all wall midpoints).
   - For each wall, the "inner" side is the side facing the centroid.
   - If the wall direction (start→end) goes clockwise around the centroid, the inner side is the LEFT side (points [0]→[1]).
   - If counter-clockwise, the inner side is the RIGHT side (points [3]→[2]).
3. Collect the inner edge points for each wall.
4. The inner polygon is formed by connecting these inner edges, mitering the corners.

**Corner mitering** (reuse existing logic):
- At each shared endpoint between two walls, compute the intersection of the two inner edges.
- Use `PlanController.computeIntersection()` (line 3120) — already handles parallel lines and vertical cases.
- This gives the exact inner corner point.

**Result**: A `float[][]` polygon representing the room's floor area.

#### 1.3 Create Room from Inner Polygon

**Modify: `PlanController.java`**

Add a new method:
```java
private Room createRoomFromWallLoop(List<Wall> loop)
```

Logic:
1. Call the inner polygon extractor above.
2. Create a `Room` with the extracted points.
3. Apply default floor properties (see Section 3).
4. Add the room to `home` via `home.addRoom(room)`.
5. Fire a `RoomsCreationUndoableEdit` for undo support.
6. Select the new room.

**Trigger points**:
- **Automatic**: When the last wall in a chain closes a loop (detected in `WallDrawingState.endWallCreation()` or `validateDrawnWalls()`).
- **Manual**: A new "Auto-Floor" button/menu item that scans all wall loops and creates rooms.
- **On wall move**: When a wall is moved such that it closes a loop, auto-generate the room.

#### 1.4 Wall Move → Room Update

**Modify: `PlanController.wallChangeListener`** (line 2461)

When a wall's position changes (X_START, X_END, Y_START, Y_END):
1. Check if the wall is part of any closed loop.
2. If yes, check if a Room already exists for that loop.
3. If a Room exists, update its polygon to match the new inner polygon.
4. If no Room exists but a loop is newly formed, create one.

**Debounce**: Don't recompute on every mouse move — only on mouse release (wall drag complete).

---

## 2. Wall Drawing UX Polish

### 2.1 Closed-Loop Preview

**Modify: `WallDrawingState.moveMouse()`** (line 10662)

When the user is drawing a wall and the endpoint is near an existing free wall start/end:
1. Check if closing this wall would form a closed loop.
2. If yes, highlight the would-be room area with a semi-transparent overlay.
3. Show a tooltip: "Close room? (Double-click to finish)"

**Implementation**:
- After computing the snapped end point, temporarily add the would-be wall to the graph.
- Run the loop detector on the temporary graph.
- If a loop is found, compute and render the inner polygon as a preview.

### 2.2 Improved Snapping

**Current state**: `WallDrawingState` already snaps to existing wall endpoints (`getWallEndAt`, `getWallStartAt`).

**Enhancement**: Also snap to:
- Midpoints of existing walls (for bisecting rooms).
- Perpendicular alignment to existing walls (already partially implemented via `PointWithAngleMagnetism`).

### 2.3 Loop Closure Feedback

**Modify: `WallDrawingState.pressMouse()`** (line 10732)

When the user double-clicks to finish a wall chain:
1. Before calling `validateDrawnWalls()`, check if the chain forms a closed loop.
2. If yes, prompt: "Close room? This will auto-generate a floor area."
3. On confirmation, create the Room from the loop.

---

## 3. Floor Auto-Materials

### 3.1 Default Floor Properties

**Modify: `HomePreferences.java`**

Add new preferences:
```java
public static final String DEFAULT_FLOOR_COLOR = "defaultFloorColor";
public static final String DEFAULT_FLOOR_TEXTURE = "defaultFloorTexture";
public static final String DEFAULT_FLOOR_SHININESS = "defaultFloorShininess";
public static final String DEFAULT_CEILING_COLOR = "defaultCeilingColor";
```

Defaults:
- Floor color: light gray (0xF0F0F0)
- Floor shininess: 0 (matte)
- Ceiling color: white (0xFFFFFF)
- Ceiling visible: true

### 3.2 Auto-Apply on Room Creation

**Modify: `PlanController.createRoom()`** (the internal method that instantiates Room objects)

After creating a Room, before adding it to `home`:
```java
HomePreferences preferences = getHome().getPreferences();
room.setFloorColor(preferences.getDefaultFloorColor());
room.setFloorVisible(true);
room.setCeilingColor(preferences.getDefaultCeilingColor());
room.setCeilingVisible(true);
```

This applies to both manually drawn rooms and auto-generated rooms.

### 3.3 Per-Wall-Loop Material Inheritance

**Optional enhancement**: When updating a room's polygon (due to wall move), preserve the user's chosen floor material. Only set defaults on initial creation, not on updates.

---

## 4. Implementation Order

### Phase 1: Auto-Floor Core (highest impact)
1. Create `WallLoopDetector` class
2. Add `createRoomFromWallLoop()` to PlanController
3. Trigger on wall chain completion (double-click)
4. Add undo support

### Phase 2: Floor Auto-Materials
5. Add default floor/ceiling preferences to HomePreferences
6. Modify `createRoom()` to apply defaults
7. Add preferences UI panel

### Phase 3: Wall Drawing UX
8. Add closed-loop preview in `moveMouse()`
9. Add loop closure prompt in `pressMouse()`
10. Add "Auto-Floor" menu item for batch generation

### Phase 4: Wall Move → Room Update
11. Modify `wallChangeListener` to detect loop changes
12. Update room polygons on wall move
13. Debounce recomputation

---

## 5. Key Files to Modify

| File | Changes |
|------|---------|
| `PlanController.java` | Add loop detection, room creation from walls, preview rendering, wall move → room update |
| `WallController.java` | Add auto-floor toggle property |
| `HomePreferences.java` | Add default floor/ceiling color/texture preferences |
| `Home.java` | No changes needed (rooms already stored in `rooms` list) |
| `Room.java` | No changes needed (polygon model already supports arbitrary polygons) |
| `Room3D.java` | No changes needed (already renders any room polygon) |
| `Wall.java` | No changes needed (polygon model already provides corner points) |

### New Files
| File | Purpose |
|------|---------|
| `WallLoopDetector.java` | Detect closed wall loops from endpoint adjacency graph |

---

## 6. Edge Cases & Risks

| Case | Handling |
|------|----------|
| **T-junctions** | A wall ending at another wall's midpoint creates a T. The loop detector must exclude loops that pass through T-junction nodes (degree > 2). |
| **Overlapping walls** | Two walls on top of each other. Use `getWallsArea()` union to deduplicate before loop detection. |
| **Round walls (arcExtent)** | Arc walls have more than 4 points. The inner polygon extraction must handle curved edges — sample the arc at sufficient resolution. |
| **Sloping walls (height ≠ heightAtEnd)** | Floor polygon is still flat (at the wall's level elevation). No special handling needed. |
| **Multi-level homes** | Only detect loops within the currently selected level. Use `wall.isAtLevel(home.getSelectedLevel())`. |
| **Very thin walls** | Inner polygon may have near-zero area. Filter out loops with area < threshold. |
| **Undo/redo** | All room creation/update must go through `UndoableEdit` for proper undo support. |
| **Performance** | Loop detection on every wall add/move could be expensive. Cache the loop graph and only recompute on structural changes (wall add/delete/endpoints change). |

---

## 7. Testing Strategy

1. **Unit test WallLoopDetector**: Create synthetic wall sets, verify correct loop detection.
2. **Integration test**: Draw 4 walls forming a rectangle → verify room is auto-created.
3. **Edge case tests**: T-junctions, overlapping walls, round walls, multi-level.
4. **UX test**: Wall drawing with closed-loop preview, undo/redo of auto-created rooms.
5. **Visual test**: Compare auto-generated room polygons with manually drawn rooms for same wall layout.
