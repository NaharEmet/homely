# Graph Report - house_designer  (2026-08-25)

## Corpus Check
- 99 files · ~53,780 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1250 nodes · 2287 edges · 98 communities (69 shown, 29 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `35f36da4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_dsl.py
- homely-handler.ts
- devDependencies
- What You Must Do When Invoked
- Sh3dApplication
- compilerOptions
- MockAdapter
- required
- tauri.conf.json
- required
- properties
- Homely Build Plan — Multi-Agent Coordination
- test_adapters.py
- null
- $defs
- Commands
- properties
- cameras
- capabilities
- StorageAdapter
- manifest.json
- HomeModel
- properties
- type
- graphify reference: extra exports and benchmark
- Architecture Map - SH3D to Homely + Equivalence Harness
- AdapterError
- enum
- default.json
- home-project.schema.json
- graphify reference: query, path, explain
- AGENTS_STEWARD — house_designer workspace
- AuthAdapter
- engine.ts
- properties
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- areaVisible
- view3d.test.ts
- test_reporting.py
- properties
- View3D
- sh3d-driver (Track A)
- homely
- movable
- rollDeg
- required
- enum
- smoke_client.py
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- scripts
- text
- package.json
- items
- elevationEnd
- dependencies
- test-equivalence
- model.ts
- height
- heightAtEnd
- CameraDirector
- MockOrchestrator
- export.test.ts
- SH3D plan-tool behaviours (observed, for clone parity)
- HomeStore
- selection
- angle
- items
- items
- run.sh
- eq/__init__.py
- extraction-spec.md
- floorColor
- test_comparators.py
- floorThickness
- eq
- homely
- Orchestrator
- rightSideColor
- thickness
- eslint
- build.sh
- @eslint/js
- @tauri-apps/cli
- @types/node
- vitest
- ws
- opencode.json
- graphify.js

## God Nodes (most connected - your core abstractions)
1. `MockAdapter` - 70 edges
2. `HomeModel` - 43 edges
3. `Sh3dApplication` - 33 edges
4. `InteractionCommands` - 27 edges
5. `load_scenario()` - 27 edges
6. `HomeStore` - 27 edges
7. `required` - 26 edges
8. `AdapterError` - 24 edges
9. `PlanEngine` - 24 edges
10. `Orchestrator` - 22 edges

## Surprising Connections (you probably didn't know these)
- `MockAdapter` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/mock.py → equivalence/eq/adapters/base.py
- `Orchestrator` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/orchestrator.py → equivalence/eq/adapters/base.py
- `test_mock_furniture_add_select_modify_delete()` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/tests/test_adapters.py → equivalence/eq/adapters/base.py
- `test_mock_unknown_command_raises()` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/tests/test_adapters.py → equivalence/eq/adapters/base.py
- `test_server_websocket_handshake_and_request_correlation()` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/tests/test_adapters.py → equivalence/eq/adapters/base.py

## Import Cycles
- None detected.

## Communities (98 total, 29 thin omitted)

### Community 0 - "test_dsl.py"
Cohesion: 0.06
Nodes (50): BaseModel, Scenario DSL: YAML schema + loader for equivalence runs (ticket C1)., _clean_msg(), _format_loc(), parse_scenario(), Any, Exception, YAML loading + error formatting for scenario files. Every validation issue is… (+42 more)

### Community 1 - "homely-handler.ts"
Cohesion: 0.11
Nodes (19): argIdx, AutomationClient, AutomationClientOptions, automationPortFromEnv(), automationPortFromSearch(), AutomationRequest, ClientStatus, CommandHandler (+11 more)

### Community 2 - "devDependencies"
Cohesion: 0.13
Nodes (15): ajv, devDependencies, ajv, prettier, tsx, @types/ws, typescript, typescript-eslint (+7 more)

### Community 3 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 4 - "Sh3dApplication"
Cohesion: 0.05
Nodes (29): BufferedImage, Camera, com.eteks.sweethome3d.HomeFrameController, com.eteks.sweethome3d.model.Home, com.eteks.sweethome3d.model.Selectable, com.eteks.sweethome3d.SweetHome3D, com.eteks.sweethome3d.viewcontroller.PlanController, com.google.gson.JsonElement (+21 more)

### Community 5 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+16 more)

### Community 6 - "MockAdapter"
Cohesion: 0.09
Nodes (5): _empty_state(), MockAdapter, Any, _round3(), Image

### Community 7 - "required"
Cohesion: 0.11
Nodes (19): required, angleDeg, depth, elevation, floorThickness, height, id, name (+11 more)

### Community 8 - "tauri.conf.json"
Cohesion: 0.09
Nodes (22): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+14 more)

### Community 9 - "required"
Cohesion: 0.22
Nodes (9): required, capabilities, dimensionLines, furniture, labels, levels, rooms, schemaVersion (+1 more)

### Community 10 - "properties"
Cohesion: 0.15
Nodes (17): type, $ref, properties, default, $ref, fixedSize, fovDeg, pitchDeg (+9 more)

### Community 11 - "Homely Build Plan — Multi-Agent Coordination"
Cohesion: 0.12
Nodes (15): Board rules, Claim Board, clone-dev, driver-dev, harness-dev, Homely Build Plan — Multi-Agent Coordination, integrator (grace) — reference, Kickoff prompts (paste into each agent terminal) (+7 more)

### Community 12 - "test_adapters.py"
Cohesion: 0.11
Nodes (34): Draft202012Validator, build_mock_adapters(), One mock per compared app: sh3d original + one clone per target mode., fixture, Tests for eq.adapters: mock protocol implementation, automation server, and the…, Determinism smoke: same scenario twice -> identical artifacts modulo wall-clock…, run(), test_build_mock_adapters_covers_sh3d_plus_target_modes() (+26 more)

### Community 13 - "null"
Cohesion: 0.16
Nodes (17): type, type, ref, type, type, type, activeTool, catalogId (+9 more)

### Community 14 - "$defs"
Cohesion: 0.13
Nodes (15): description, type, $defs, colorNullable, length, lengthNullable, lengthPositive, radianNullable (+7 more)

### Community 15 - "Commands"
Cohesion: 0.17
Nodes (11): Commands, Determinism requirements (both apps), Editing actions (map to SH3D ActionType / clone commands), Envelope, Furniture, Homely Automation WebSocket Protocol v1, Introspection & capture, Lifecycle (+3 more)

### Community 16 - "properties"
Cohesion: 0.05
Nodes (39): $ref, $ref, default, type, $ref, $ref, $ref, $ref (+31 more)

### Community 17 - "cameras"
Cohesion: 0.20
Nodes (10): properties, required, type, type, cameras, observer, top, type (+2 more)

### Community 18 - "capabilities"
Cohesion: 0.20
Nodes (10): type, type, properties, required, type, canRedo, canUndo, capabilities (+2 more)

### Community 19 - "StorageAdapter"
Cohesion: 0.27
Nodes (3): TauriFsStorage, StorageAdapter, StorageUnavailableError

### Community 20 - "manifest.json"
Cohesion: 0.12
Nodes (16): linux, sh3d, tauri, adapters, assertions, assertionsEvaluatedBy, checkpoints, description (+8 more)

### Community 21 - "HomeModel"
Cohesion: 0.13
Nodes (8): DimensionLine, Label, assert(), HomeModel, requireFinite(), requireFiniteNumbers(), requirePositive(), validatePatch()

### Community 22 - "properties"
Cohesion: 0.17
Nodes (12): properties, type, $ref, $ref, environment, groundColor, lightColor, skyColor (+4 more)

### Community 23 - "type"
Cohesion: 0.21
Nodes (12): items, maxItems, minItems, type, items, maxItems, type, items (+4 more)

### Community 24 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 25 - "Architecture Map - SH3D to Homely + Equivalence Harness"
Cohesion: 0.25
Nodes (7): 1. Original application (Sweet Home 3D 7.5), 2. Clone (homely/) target design, 3. Equivalence harness (equivalence/eq/), 4. sh3d-driver (equivalence/driver-java/), 5. Test levels, 6. Environment facts (verified 2026-08-24), Architecture Map - SH3D to Homely + Equivalence Harness

### Community 26 - "AdapterError"
Cohesion: 0.11
Nodes (12): AdapterError, Exception, An adapter answered ok=false (or a request failed transport-side)., AutomationServer, Any, Orchestrator-side automation server (ws-protocol.md v1). Adapters connect TO…, One connected adapter; correlates responses to pending requests by id., Listens on ephemeral WebSocket + TCP ports until `stop()`. (+4 more)

### Community 27 - "enum"
Cohesion: 0.25
Nodes (8): enum, dimensionLine, label, panning, polyline, room, selection, wall

### Community 28 - "default.json"
Cohesion: 0.29
Nodes (6): identifier, permissions, $schema, windows, core:default, main

### Community 29 - "home-project.schema.json"
Cohesion: 0.33
Nodes (5): description, $id, $schema, title, type

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "AGENTS_STEWARD — house_designer workspace"
Cohesion: 0.40
Nodes (4): AGENTS_STEWARD — house_designer workspace, Coordination protocol, Key facts (from architecture research — do not re-derive), Layout & ownership (STRICT)

### Community 33 - "engine.ts"
Cohesion: 0.06
Nodes (26): ClickInput, DragInput, PIXEL_MARGIN, PLAN_SCALE, PlanEngine, PlanKey, PlanPreview, PlanTool (+18 more)

### Community 34 - "properties"
Cohesion: 0.17
Nodes (12): items, type, items, type, properties, dimensionLines, labels, rooms (+4 more)

### Community 35 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 36 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 37 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 38 - "areaVisible"
Cohesion: 0.67
Nodes (3): default, type, areaVisible

### Community 39 - "view3d.test.ts"
Cohesion: 0.16
Nodes (17): ModelError, CameraPatch, CameraPresetName, buildScene(), DEFAULT_FLOOR_COLOR, DEFAULT_FURNITURE_COLOR, DEFAULT_WALL_COLOR, elevationFor() (+9 more)

### Community 40 - "test_reporting.py"
Cohesion: 0.09
Nodes (38): main(), _parse_target(), ``python -m eq.reporting`` CLI and the repo-root ``test-equivalence`` tool.…, ``--target linux,tauri`` → ({"linux"}, {"tauri"}); ``*`` means all., _failure_lines(), _fmt(), Any, Markdown rendering of a suite aggregate, with verbosity levels. - level 0:… (+30 more)

### Community 41 - "properties"
Cohesion: 0.13
Nodes (15): properties, type, $ref, type, type, $ref, compass, diameter (+7 more)

### Community 43 - "sh3d-driver (Track A)"
Cohesion: 0.13
Nodes (14): Boot recipe (why it works without `SweetHome3D.init()`), Build & run, Layout, Notes / limitations, Protocol surface (A1), Protocol surface (A2 interact), Protocol surface (A3 full state export), Protocol surface (A4 capture-io) (+6 more)

### Community 44 - "homely"
Cohesion: 0.22
Nodes (8): Automation protocol (v1), Core model (B2), Empty-home defaults, homely, Layout, Legal note, Prerequisites, Quickstart

### Community 45 - "movable"
Cohesion: 0.67
Nodes (3): default, type, movable

### Community 46 - "rollDeg"
Cohesion: 0.67
Nodes (3): rollDeg, default, $ref

### Community 47 - "required"
Cohesion: 0.43
Nodes (8): required, required, fovDeg, pitchDeg, x, y, yawDeg, z

### Community 48 - "enum"
Cohesion: 0.29
Nodes (7): enum, type, lens, FISHEYE, NORMAL, PINHOLE, SPHERICAL

### Community 53 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, preview, smoke, tauri (+1 more)

### Community 55 - "package.json"
Cohesion: 0.25
Nodes (7): allowScripts, esbuild@0.25.12, esbuild@0.28.2, name, private, type, version

### Community 56 - "items"
Cohesion: 0.67
Nodes (3): items, type, furniture

### Community 58 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @tauri-apps/api, three, @types/three, @tauri-apps/api, three, @types/three

### Community 60 - "model.ts"
Cohesion: 0.16
Nodes (16): ActiveTool, CamerasState, CapabilitiesState, CompassState, DEFAULT_WALL_HEIGHT_CM, EnvironmentState, Furniture, LensName (+8 more)

### Community 63 - "CameraDirector"
Cohesion: 0.38
Nodes (3): CameraState, ObserverCameraState, CameraDirector

### Community 64 - "MockOrchestrator"
Cohesion: 0.22
Nodes (5): main(), HelloMessage, MockOrchestrator, OrchestratorSentRequest, PendingResponse

### Community 65 - "export.test.ts"
Cohesion: 0.24
Nodes (15): default, type, doorOrWindow, normalizeAngle(), roundAngle(), roundHalfEven(), roundLen(), roundPoint() (+7 more)

### Community 66 - "SH3D plan-tool behaviours (observed, for clone parity)"
Cohesion: 0.33
Nodes (5): Automation protocol notes (for orchestrator-side consumers), Clone-side protocol deviations (pending integrator amendment), Model/interaction facts, SH3D plan-tool behaviours (observed, for clone parity), Wall tool state machine (what B3 plan-view must replicate)

### Community 68 - "selection"
Cohesion: 0.50
Nodes (4): selection, description, items, type

### Community 69 - "angle"
Cohesion: 0.67
Nodes (3): description, type, angle

### Community 70 - "items"
Cohesion: 0.67
Nodes (3): items, type, levels

### Community 71 - "items"
Cohesion: 0.67
Nodes (3): walls, items, type

### Community 79 - "test_comparators.py"
Cohesion: 0.05
Nodes (80): _bool_int_clash(), _check(), evaluate_assertion(), evaluate_assertions(), Any, Evaluation of scenario assertions against captured artifacts. Assertions come…, Evaluate all manifest assertions; returns ``{records, passed, counts}``., Resolve a dotted path like ``walls.0.xStart`` or ``walls[0].xStart``. Returns… (+72 more)

### Community 86 - "Orchestrator"
Cohesion: 0.11
Nodes (19): ABC, Adapter, Any, Adapter abstraction over the automation surfaces (ws-protocol.md v1). Every…, One automation endpoint participating in a lockstep run. `name` is the instance…, Send one command envelope; return response data or raise AdapterError., main(), Path (+11 more)

### Community 217 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **345 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `$schema`, `$id`, `title` (+340 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `properties` connect `properties` to `properties`, `null`, `type`, `properties`, `areaVisible`, `properties`, `movable`, `rollDeg`, `text`, `items`, `elevationEnd`, `height`, `heightAtEnd`, `export.test.ts`, `items`, `items`, `floorColor`, `floorThickness`, `rightSideColor`, `thickness`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `properties` connect `properties` to `selection`, `items`, `items`, `properties`, `null`, `cameras`, `capabilities`, `properties`, `items`, `home-project.schema.json`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `doorOrWindow` connect `export.test.ts` to `properties`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `MockAdapter` (e.g. with `AdapterError` and `test_build_mock_adapters_covers_sh3d_plus_target_modes()`) actually correct?**
  _`MockAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `$schema` to the rest of the system?**
  _345 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `test_dsl.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06345848757271286 - nodes in this community are weakly interconnected._
- **Should `homely-handler.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11051693404634581 - nodes in this community are weakly interconnected._