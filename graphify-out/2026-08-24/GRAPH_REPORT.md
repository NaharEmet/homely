# Graph Report - house_designer  (2026-08-24)

## Corpus Check
- 77 files · ~36,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 968 nodes · 1539 edges · 81 communities (61 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `503b9779`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_dsl.py
- home.ts
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
- items
- properties
- type
- graphify reference: extra exports and benchmark
- Architecture Map - SH3D to Homely + Equivalence Harness
- AutomationServer
- enum
- default.json
- home-project.schema.json
- graphify reference: query, path, explain
- AGENTS_STEWARD — house_designer workspace
- AuthAdapter
- type
- properties
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- areaVisible
- ceilingVisible
- schema.py
- properties
- Adapter
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
- items
- text
- color
- elevationEnd
- elevationStart
- height
- heightAtEnd
- id
- viewable
- run.sh
- eq/__init__.py
- extraction-spec.md
- AdapterError
- test_comparators.py
- eq
- homely
- Orchestrator
- validator
- build.sh
- opencode.json
- graphify.js

## God Nodes (most connected - your core abstractions)
1. `MockAdapter` - 68 edges
2. `required` - 26 edges
3. `load_scenario()` - 25 edges
4. `Sh3dApplication` - 24 edges
5. `AdapterError` - 24 edges
6. `Orchestrator` - 20 edges
7. `Adapter` - 19 edges
8. `run()` - 19 edges
9. `InteractionCommands` - 16 edges
10. `invalid()` - 16 edges

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

## Communities (81 total, 20 thin omitted)

### Community 0 - "test_dsl.py"
Cohesion: 0.11
Nodes (30): _clean_msg(), _format_loc(), parse_scenario(), Any, Exception, Raised when a scenario YAML cannot be parsed or validated. `.issues` holds one…, Validate an already-parsed YAML mapping into a Scenario., ScenarioLoadError (+22 more)

### Community 1 - "home.ts"
Cohesion: 0.06
Nodes (38): argIdx, main(), AutomationClient, AutomationClientOptions, automationPortFromEnv(), automationPortFromSearch(), AutomationRequest, ClientStatus (+30 more)

### Community 2 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, @eslint/js, allowScripts, esbuild@0.25.12, esbuild@0.28.2, dependencies, @tauri-apps/api, devDependencies (+36 more)

### Community 3 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 4 - "Sh3dApplication"
Cohesion: 0.06
Nodes (21): Action, com.eteks.sweethome3d.HomeFrameController, com.eteks.sweethome3d.model.Home, com.eteks.sweethome3d.SweetHome3D, com.eteks.sweethome3d.viewcontroller.PlanController, com.google.gson.JsonElement, com.google.gson.JsonObject, DriverMain (+13 more)

### Community 5 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+15 more)

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
Cohesion: 0.12
Nodes (31): build_mock_adapters(), One mock per compared app: sh3d original + one clone per target mode., Tests for eq.adapters: mock protocol implementation, automation server, and the…, Determinism smoke: same scenario twice -> identical artifacts modulo wall-clock…, run(), test_build_mock_adapters_covers_sh3d_plus_target_modes(), test_mock_camera_presets_match_reference_defaults(), test_mock_copy_paste_creates_offset_clone_and_updates_selection() (+23 more)

### Community 13 - "null"
Cohesion: 0.16
Nodes (17): type, type, ref, type, type, type, activeTool, catalogId (+9 more)

### Community 14 - "$defs"
Cohesion: 0.14
Nodes (14): description, type, $defs, angle, length, lengthNullable, lengthPositive, radianNullable (+6 more)

### Community 15 - "Commands"
Cohesion: 0.17
Nodes (11): Commands, Determinism requirements (both apps), Editing actions (map to SH3D ActionType / clone commands), Envelope, Furniture, Homely Automation WebSocket Protocol v1, Introspection & capture, Lifecycle (+3 more)

### Community 16 - "properties"
Cohesion: 0.05
Nodes (39): $ref, $ref, $ref, default, type, $ref, $ref, $ref (+31 more)

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

### Community 21 - "items"
Cohesion: 0.67
Nodes (3): items, type, dimensionLines

### Community 22 - "properties"
Cohesion: 0.17
Nodes (12): properties, type, $ref, $ref, environment, groundColor, lightColor, skyColor (+4 more)

### Community 23 - "type"
Cohesion: 0.16
Nodes (15): items, maxItems, minItems, type, items, maxItems, type, items (+7 more)

### Community 24 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 25 - "Architecture Map - SH3D to Homely + Equivalence Harness"
Cohesion: 0.25
Nodes (7): 1. Original application (Sweet Home 3D 7.5), 2. Clone (homely/) target design, 3. Equivalence harness (equivalence/eq/), 4. sh3d-driver (equivalence/driver-java/), 5. Test levels, 6. Environment facts (verified 2026-08-24), Architecture Map - SH3D to Homely + Equivalence Harness

### Community 26 - "AutomationServer"
Cohesion: 0.16
Nodes (6): AutomationServer, Any, Listens on ephemeral WebSocket + TCP ports until `stop()`., ServerConnection, StreamReader, StreamWriter

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

### Community 33 - "type"
Cohesion: 0.50
Nodes (4): description, type, colorNullable, integer

### Community 34 - "properties"
Cohesion: 0.12
Nodes (16): items, type, items, type, properties, furniture, levels, rooms (+8 more)

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

### Community 39 - "ceilingVisible"
Cohesion: 0.67
Nodes (3): default, type, ceilingVisible

### Community 40 - "schema.py"
Cohesion: 0.11
Nodes (20): BaseModel, Path, Scenario DSL: YAML schema + loader for equivalence runs (ticket C1)., YAML loading + error formatting for scenario files. Every validation issue is…, Assertion, _check_type(), Checkpoint, Any (+12 more)

### Community 41 - "properties"
Cohesion: 0.13
Nodes (15): properties, type, $ref, type, type, $ref, compass, diameter (+7 more)

### Community 42 - "Adapter"
Cohesion: 0.27
Nodes (5): ABC, Adapter, Any, One automation endpoint participating in a lockstep run. `name` is the instance…, Send one command envelope; return response data or raise AdapterError.

### Community 43 - "sh3d-driver (Track A)"
Cohesion: 0.25
Nodes (7): Boot recipe (why it works without `SweetHome3D.init()`), Build & run, Layout, Notes / limitations, Protocol surface (A1), sh3d-driver (Track A), Verification transcript (A1 DoD)

### Community 44 - "homely"
Cohesion: 0.25
Nodes (7): Automation protocol (v1), Empty-home defaults, homely, Layout, Legal note, Prerequisites, Quickstart

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

### Community 53 - "items"
Cohesion: 0.67
Nodes (3): items, type, labels

### Community 78 - "AdapterError"
Cohesion: 0.18
Nodes (9): AdapterError, Exception, Adapter abstraction over the automation surfaces (ws-protocol.md v1). Every…, An adapter answered ok=false (or a request failed transport-side)., Adapter layer + orchestrator for the equivalence harness (Track C)., MockAdapter: deterministic in-process reference implementation of the…, Orchestrator-side automation server (ws-protocol.md v1). Adapters connect TO…, One connected adapter; correlates responses to pending requests by id. (+1 more)

### Community 79 - "test_comparators.py"
Cohesion: 0.05
Nodes (80): _bool_int_clash(), _check(), evaluate_assertion(), evaluate_assertions(), Any, Evaluation of scenario assertions against captured artifacts. Assertions come…, Evaluate all manifest assertions; returns ``{records, passed, counts}``., Resolve a dotted path like ``walls.0.xStart`` or ``walls[0].xStart``. Returns… (+72 more)

### Community 86 - "Orchestrator"
Cohesion: 0.25
Nodes (10): main(), Path, Demo entry point for C2 DoD: execute a scenario YAML against two MockAdapters…, _run(), _collect_ids(), Orchestrator, Any, Lockstep scenario orchestrator (C2). Executes a Scenario against every… (+2 more)

### Community 89 - "validator"
Cohesion: 0.67
Nodes (3): Draft202012Validator, fixture, validator()

### Community 217 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **323 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `$schema`, `$id`, `title` (+318 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `properties` connect `properties` to `properties`, `null`, `items`, `type`, `properties`, `areaVisible`, `ceilingVisible`, `properties`, `movable`, `rollDeg`, `items`, `text`, `color`, `elevationEnd`, `elevationStart`, `height`, `heightAtEnd`, `id`, `viewable`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `properties` connect `properties` to `properties`, `null`, `cameras`, `capabilities`, `type`, `items`, `properties`, `items`, `home-project.schema.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `MockAdapter` connect `MockAdapter` to `Orchestrator`, `Adapter`, `test_adapters.py`, `AdapterError`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `MockAdapter` (e.g. with `AdapterError` and `test_build_mock_adapters_covers_sh3d_plus_target_modes()`) actually correct?**
  _`MockAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `$schema` to the rest of the system?**
  _323 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `test_dsl.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._
- **Should `home.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059027777777777776 - nodes in this community are weakly interconnected._