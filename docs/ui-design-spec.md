# Homely UI Design Spec

> SH3D's interaction model, wrapped in a modern design-app UI.
> Reference apps: Figma, Sketch, Floorplanner, Planner5D.

## Core Principle

The **data model and interaction semantics are SH3D-frozen** (vertex-based
walls, tool state machine, undo/redo, selection). The **visual layer is modern**
— clean chrome, smooth transitions, contextual UI, dark/light themes.

---

## Layout (SH3D-style, modernized)

```
┌─────────────────────────────────────────────────────────┐
│ ☰  File  Edit  View  3D   Help          🔍 ⚙️  🌙     │  ← Menu bar (slim, 36px)
├───────┬──────────────────────────────┬──────────────────┤
│ Tools │                              │   Properties     │  ← Toolbar + Panels
│  ┌─┐  │     Plan View (canvas)       │   ┌──────────┐  │
│  │\param│                              │   │ Wall     │  │
│  ├─┤  │     grid + walls + rooms     │   │ xStart:  │  │
│  │🪑│ │     + furniture + labels     │   │ 100.00   │  │
│  ├─┤  │                              │   │ yStart:  │  │
│  │📐│ │                              │   │ 100.00   │  │
│  ├─┤  │                              │   │ xEnd:    │  │
│  │T │ │                              │   │ 600.00   │  │
│  └──┘ │                              │   │ ...      │  │
│       │                              │   └──────────┘  │
├───────┴──────────────────────────────┴──────────────────┤
│ 3D View (Three.js)                    Layers  │ Stats  │  ← Bottom panels
│                                               │        │
└─────────────────────────────────────────────────────────┘
│ x: 100.00  y: 100.00   wall   zoom: 100%   auto: ✅   │  ← Status bar (28px)
```

### Key layout rules
- **Slim chrome**: menu bar 36px, status bar 28px, toolbar icons 32px
- **Resizable panels**: drag dividers between plan/3d/properties
- **Collapsible panels**: properties panel toggles with ] shortcut or button
- **Plan/3D split**: default 50/50, resizable. Toggle buttons for plan-only | split | 3d-only
- **Dark mode**: full dark theme via CSS custom properties, toggle in menu + Cmd+Shift+D

---

## Tool Palette (left sidebar, vertical)

SH3D tools mapped to modern icons. Vertical strip, 48px wide, tool buttons 36×36.

| Tool | Icon | SH3D equivalent | Shortcut | Behavior |
|------|------|-----------------|----------|----------|
| Select | ◇ (pointer) | selection | V / Escape | Click to select, drag to move, marquee select |
| Wall | ╱ (line) | wall | W | Click-click-click to chain walls, dbl-click to close |
| Room | □ (polygon) | room | R | Click points to define room polygon (future) |
| Dimension | ↔ (ruler) | dimensionLine | D | Click two points for dimension line (future) |
| Text | T (label) | label | T | Click to place text label (future) |
| Furniture | 🪑 (chair) | furniture (catalog) | F | Open catalog → click-to-place piece in plan |
| Compass | 🧭 | compass | C | Click to place/reposition compass (future) |

- **Active tool**: highlighted with accent color background, cursor changes
- **Disabled tools**: grayed out with "coming soon" tooltip
- **Tool options bar**: below toolbar, shows context-sensitive options for active tool (e.g., wall tool shows: magnetism toggle, snap-to-grid toggle)

---

## Furniture Catalog (left panel, SH3D-style)

Opens when the Furniture tool (F) is active, or via a catalog toggle button.
Left sidebar panel, 240px wide, collapsible.

### Layout
- **Category list**: top section, vertical — Living, Bedroom, Kitchen, Bathroom,
  Dining, Office, Doors, Windows, Outdoor (each with count badge)
- **Search**: filter box above the grid (matches name / category / tags)
- **Thumbnail grid**: 2-column grid of pieces; thumbnail + name below;
  click piece → switches to place mode
- **Place mode**: cursor shows piece outline at footprint; click in plan commits
  `addFurniture` at that point; piece stays "armed" for multiple placement
  (SH3D parity), Escape exits place mode back to select

### Catalog data
- Bundled catalog manifest (`catalog.json`): `{catalogId, name, category,
  width, depth, height, elevation?, doorOrWindow?, color?, model?}` — units cm
- Dimensions resolved from the manifest at placement (no inline dims needed)
- Optional `model` field → 3D asset path (GLB/OBJ) rendered in 3D view;
  pieces without a model fall back to a colored box of catalog dims
- Thumbnails: pre-rendered PNGs in `assets/catalog/thumbs/` (no network fetch)

### Interaction
- Placed pieces are normal furniture: select, drag-move, rotate, delete,
  marquee-select — all existing furniture behaviour
- Undo/redo covers placement (addFurniture is a compound-edit operation)

---

## Wall Interaction (vertex-based, SH3D parity)

### Drawing walls
1. Select wall tool → cursor becomes crosshair
2. Click point A → wall preview starts rubber-banding from A to cursor
3. Click point B → wall AB committed, chain continues from B
4. Click point C → wall BC committed, chain continues from C
5. Double-click (no move first) → joins last point to start, validates all walls
6. Escape → cancels in-progress wall, commits completed chain
7. Magnetism: toggle with M key or toolbar checkbox; snaps to grid/endpoints/midpoints

### Selecting and editing walls
1. Select tool → click near a wall → wall selected (blue highlight)
2. Selected walls show **two endpoint handles** (6×6px rounded squares, blue fill)
3. **Drag endpoint handle**: moves just that vertex, reshapes wall
4. **Drag wall body** (not on endpoint): moves entire wall (both endpoints)
5. **Connected walls**: when two walls share an endpoint (within epsilon), dragging
   that vertex moves both walls' shared endpoint — wall chain behavior
6. **Marquee select**: drag empty area → rectangle selection of walls/furniture inside
7. **Shift+click**: add/remove from selection

### Visual feedback
- **Hover over wall**: subtle highlight (lighter color, 1px outline)
- **Hover over endpoint**: cursor changes to 'move', handle grows slightly
- **Dragging**: wall preview follows cursor, connected walls show dashed preview
- **Selected**: blue outline on wall body, blue filled handles on endpoints
- **Multi-select**: all selected items highlighted, bounding box shown

---

## Plan View Rendering

### Grid
- Minor grid: 10cm, color #e8e8e8 (light) / #2a2a2a (dark)
- Major grid: 100cm (1m), color #d0d0d0 (light) / #3a3a3a (dark)
- Grid fades out at zoom < 0.3 (too dense to render)
- Origin axes: slightly darker lines at x=0, y=0

### Walls
- Rendered as **filled thick shapes** with mitered corners (not stroked lines)
- Default fill: #5a5a5a (light) / #888888 (dark)
- Left/right side colors from model if present
- Selected: blue outline (#1a66d6), 2px
- Hover: subtle brightness shift

### Rooms
- Floor fill: semi-transparent (room.floorColor or default rgba(170,200,235,0.3))
- Area label centered: "X.XX m²" in 11px font
- Room name above area if non-null
- Selected: blue outline

### Furniture
- Rotated rectangles with fill color
- Label below: furniture name (truncated)
- Selected: blue outline + 4 corner handles

### Dimension lines
- Thin line with arrows at ends
- Length label centered above line
- Selected: blue

---

## 3D View

### Rendering
- Walls: BoxGeometry with leftSideColor/rightSideColor materials
- Rooms: ShapeGeometry floor planes + ceiling (optional)
- Furniture: BoxGeometry with color
- Ground: large plane with grid texture (faint lines)
- Shadows: directional light shadow mapping (soft shadows)
- Ambient: HemisphereLight for natural outdoor feel + AmbientLight fill

### Camera controls (modern orbit)
- **Left drag**: orbit (rotate around target)
- **Right drag** or **Ctrl+left drag**: pan
- **Scroll**: zoom (centered on cursor)
- **Middle drag**: pan (matching plan view)
- **1**: top view preset
- **2**: front view preset  
- **3**: perspective view preset
- **Shift+C**: fit to scene
- Smooth inertia on all movements (damping)

### Visual polish
- Fog for distance (subtle, matches background color)
- Grid on ground plane (fades with distance)
- Selection highlight: blue outline glow on selected objects
- Wall edges: subtle edge lines for depth perception

---

## Properties Panel (right sidebar)

Appears when something is selected. Collapsible with ] key.

### Wall properties
```
Wall
─────────────
Start    x: 100.00  y: 100.00
End      x: 600.00  y: 100.00
Length   500.00 cm
Height   250.00 cm
Thickness 7.00 cm
Angle    0.00°
Left     ■ #5a5a5a
Right    ■ #5a5a5a
Level    (none)
```

### Room properties
```
Room
─────────────
Name     
Area     15.00 m²
Perimeter 1600.00 cm
Floor    ■ rgba(170,200,235,0.3)
Visible  ✓
```

### Furniture properties
```
Furniture
─────────────
Name     Sofa
Position x: 200.00  y: 300.00
Size     200×80×85 cm
Angle    0.00°
Color    ■ #8b7355
Elevation 0.00 cm
```

- All numeric fields are **editable** — type a value, press Enter to apply
- Color fields open a color picker on click
- Changes apply immediately to model (undoable)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| V | Select tool |
| W | Wall tool |
| R | Room tool |
| D | Dimension tool |
| T | Text tool |
| F | Furniture tool (opens catalog) |
| M | Toggle magnetism |
| Escape | Cancel current operation / deselect |
| Delete/Backspace | Delete selected |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+A | Select all |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+S | Save (future) |
| Cmd/Ctrl+K | Command palette (future) |
| Cmd/Ctrl+Shift+D | Toggle dark mode |
| ] | Toggle properties panel |
| 1/2/3 | Camera presets (in 3D view) |
| Shift+C | Fit to scene |
| Space+drag | Pan (both views) |
| Scroll | Zoom (both views) |
| Ctrl+0 | Reset zoom to 100% |

---

## Color System (CSS Custom Properties)

```css
/* Light theme */
--bg-primary: #ffffff;
--bg-secondary: #f5f5f5;
--bg-tertiary: #e8e8e8;
--text-primary: #1a1a1a;
--text-secondary: #666666;
--border: #e0e0e0;
--accent: #1a66d6;
--accent-hover: #1557b0;
--selection: rgba(26,102,214,0.15);
--wall-default: #5a5a5a;
--room-fill: rgba(170,200,235,0.3);
--grid-minor: #e8e8e8;
--grid-major: #d0d0d0;

/* Dark theme */
--bg-primary: #1e1e1e;
--bg-secondary: #252525;
--bg-tertiary: #2a2a2a;
--text-primary: #e0e0e0;
--text-secondary: #999999;
--border: #3a3a3a;
--accent: #4d94ff;
--accent-hover: #6aabff;
--selection: rgba(77,148,255,0.15);
--wall-default: #888888;
--room-fill: rgba(77,148,255,0.15);
--grid-minor: #2a2a2a;
--grid-major: #3a3a3a;
```

---

## Animations & Transitions

- Panel resize: smooth 150ms ease
- Tool switch: background color 100ms ease
- Selection highlight: 100ms fade in
- Dark mode toggle: 200ms crossfade on all colors
- Menu dropdown: slide down 100ms ease + fade
- Properties panel: slide in/out 150ms ease
- Cursor changes: instant (no transition — feels laggy)

---

## Responsive Behavior

- **< 800px**: plan and 3D stack vertically, properties panel becomes bottom sheet
- **< 600px**: toolbar collapses to hamburger, tools become bottom tab bar
- **> 1600px**: can show plan + 3D + properties all side by side
