# SH3D top-camera follower & state-export contract

Source of truth: real Java driver (equivalence/driver-java) against Sweet Home 3D 7.5
(`sweethome3d-7.5-wayland-patch/`). Every number below was empirically verified against
the live driver on 2026-08-26 (probe scripts /tmp/opencode/d2_cam_probe.py,
d2_cam_steps.py; golden expected-state committed at
`equivalence/scenarios/slice/goldens/create_room.expected-state.json`).

This document is a **frozen contract** for tickets B7, B8, C8. Integrator owns changes.

## 1. Top camera follower (B7)

Mutator: `HomeController3D$TopCameraState` (HomeController3D.java:823-1330).
The top camera is NOT static — it re-places itself whenever home contents change.

### Trigger events

Listener on home collections walls / furniture / rooms / levels / dimensionLines /
labels / polylines: any ADD or DELETE, and any item property change. Selection
changes are also listened to, but the pref `aerialViewCenteredOnSelectionEnabled`
DEFAULTS TO FALSE, so the selection path is inert — bounds are always whole-home.
Homely may skip the selection path entirely (ponytail: add when the pref exists).

### Algorithm (per event)

1. `distanceToCenter` = 3D distance from camera to CURRENT bounds center,
   computed BEFORE bounds recompute.
2. Recompute bounds from home items (rules below).
3. `halfDiag = sqrt(w² + d² + h²) / 2`; `minDist = halfDiag * 1.05`;
   `maxDist = max(5 * minDist, 5000)`.
4. Place camera keeping yaw/pitch/fov, clamping distance to [minDist, maxDist]:
   - `groundDist = dist * cos(pitch)` (pitch default π/4)
   - `x = centerX + sin(yaw) * groundDist`
   - `y = centerY - cos(yaw) * groundDist`
   - `z = centerZ + sin(pitch) * dist`

Note distance is preserved when within [minDist, maxDist] — the camera orbits the
new center at its previous distance.

### Bounds rules

- Walls contribute their thick-polygon corner points (x,y); minZ=0;
  maxZ = max wall height (250cm default, incl. heightAtEnd).
- Rooms contribute their points; minZ=0, maxZ=20.
- If home contains visible walls, ensure minimum box 100×100×20, expanded
  symmetrically around the content center.
- Empty home → default box (0..100, 0..100, 0..20).

### Numeric verification (4-wall script, magnetism off)

| Moment | Bounds center | Camera |
|---|---|---|
| fresh home | (50, 50, 10) | (50, 1050, 1010), yaw -180° |
| after click 2 (first wall commits) | (350, 100, 125) | (350, 1100, 1125) |
| after click 3 | (351.75, 248.25, 125) | (351.75, 1248.25, 1125) |
| after full script (4 walls + dbl-close) | (350, 1250, 125) | (350, 1250, 1125) |

Fresh-home identity: initial camera distance sqrt(1000² + 1000²) = 1414.21 from
center (50,50,10); placement reproduces (50,1050,1010) exactly. Distance stays
1414.21 throughout the script (within clamp range).

## 2. State export rounding & angles (B8)

From InteractionCommands.java (driver export path):

- Coordinates and fovDeg (`x`, `y`, `z`, `fovDeg`, wall endpoints, level
  elevation etc.): `round3` = BigDecimal HALF_EVEN, scale 3.
- Angles (`yawDeg`, `pitchDeg`): `toDeg()` at :454 — `deg % 360` then wrapped
  into **[-180, 180)**, then round3. Yaw π exports as **-180.0** (not 180.0) —
  confirmed empirically by the driver golden (corrects the earlier (-180,180]
  note; the boundary case is pinned by create_room.expected-state.json).
- Camera ids come from IdAssigner: top camera id `'camera-top-1'`,
  observer id `'camera-observer-1'`. Homely export must emit these stable ids.

## 3. Defaults parity (B8)

Confirmed in SH3D 7.5 source / live driver golden:

| Field | Value | Source |
|---|---|---|
| new wall thickness | 7 cm | driver forces prefs height=250f/thickness=7f |
| new wall patternId | `'hatchUp'` | Home.NEW_WALL_PATTERN / UserPreferences default |
| environment.wallsAlpha | 0.0 | HomeEnvironment constructor `// Walls alpha` |
| compass.latitudeRad / longitudeRad | from OS timezone | Compass.initGeographicPoint() |

Compass: SH3D maps `TimeZone.getDefault().getID()` → geographic coordinates via a
~603-entry table in Compass.java (`initGeographicPoint()` at :418; MaxMind-derived
`GeographicPoint(lat, lon)` in degrees, stored as radians via
`(float)Math.toRadians(...)`). Fallback for an unknown zone id: the `"Etc/GMT"`
entry = **Greenwich Observatory = (51.466667, 0.0) degrees** (Compass.java:673 —
`"Etc/GMT"`, `"Etc/GMT+0"` and `"GMT"` all map to greenwich; NOT (0,0) as an
earlier draft claimed). The build machine's `/etc/localtime` symlinks to
**Asia/Thimphu** → latRad 0.48 / lonRad 1.564 (= 27.4833333°, 89.6°, round3'd).
Homely must read the same OS zone via
`Intl.DateTimeFormat().resolvedOptions().timeZone`, port the full table
(Asia/Kolkata → (22.569722, 88.369722), Asia/Thimphu → (27.4833333, 89.6),
UTC/Greenwich/Etc/GMT → (51.466667, 0)), and use the same Etc/GMT fallback.

## 4. Comparator normalization (C8)

Driver golden uses explicit `null` where homely omits keys (home name fields,
wall `arcExtent`/`heightAtEnd`/`levelRef`/`leftSideColor`/`rightSideColor`,
cameras `*.fixedSize`). Deep-diff must treat absent == null (~14 false positives
in results/20260826-105922-suite). Real null-vs-value and value-vs-value diffs
must still fail. Angle comparisons compare wrapped values (-180 vs 180 must not
appear as diffs once both sides wrap per §2).
