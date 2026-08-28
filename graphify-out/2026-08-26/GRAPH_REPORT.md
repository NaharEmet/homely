# Graph Report - house_designer  (2026-08-26)

## Corpus Check
- 108 files · ~68,286 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1457 nodes · 2811 edges · 99 communities (79 shown, 20 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `caf75910`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_dsl.py
- client.ts
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
- home-project.schema.json
- Commands
- properties
- cameras
- capabilities
- StorageAdapter
- AdapterError
- HomeModel
- properties
- top-camera-follower.ts
- graphify reference: extra exports and benchmark
- Architecture Map - SH3D to Homely + Equivalence Harness
- AutomationServer
- main.ts
- default.json
- capture.ts
- graphify reference: query, path, explain
- AGENTS_STEWARD — house_designer workspace
- AuthAdapter
- PlanEngine
- properties
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- homely-handler.ts
- view3d.test.ts
- runner.py
- properties
- View3D
- sh3d-driver (Track A)
- homely
- build_id_map
- rollDeg
- required
- enum
- FakeFramedServer
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- scripts
- engineering-manager.md
- package.json
- Adapter
- 1. Top camera follower (B7)
- dependencies
- test-equivalence
- model.ts
- ceilingVisible
- ._register
- comparators/__init__.py
- floorVisible
- export.test.ts
- SH3D plan-tool behaviours (observed, for clone parity)
- HomeStore
- drawPlan
- compare_images
- evaluate_assertion
- CameraDirector
- run.sh
- eq/__init__.py
- automation_port
- extraction-spec.md
- FakeHomelyClient
- test_comparators.py
- IdMap
- eq
- homely
- load_scenario
- compare_states
- @eslint/js
- areaVisible
- build.sh
- run.py
- @tauri-apps/cli
- @types/node
- vitest
- ws
- eslint
- opencode.json
- graphify.js

## God Nodes (most connected - your core abstractions)
1. `MockAdapter` - 70 edges
2. `HomeModel` - 47 edges
3. `AdapterError` - 36 edges
4. `HomeStore` - 34 edges
5. `Sh3dApplication` - 33 edges
6. `AutomationServer` - 32 edges
7. `PlanEngine` - 31 edges
8. `load_scenario()` - 29 edges
9. `InteractionCommands` - 27 edges
10. `NormalizedHomeState` - 27 edges

## Surprising Connections (you probably didn't know these)
- `HomelyAdapter` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/homely.py → equivalence/eq/adapters/base.py
- `MockAdapter` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/mock.py → equivalence/eq/adapters/base.py
- `Orchestrator` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/orchestrator.py → equivalence/eq/adapters/base.py
- `Sh3dAdapter` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/sh3d.py → equivalence/eq/adapters/base.py
- `test_mock_furniture_add_select_modify_delete()` --uses--> `AdapterError`  [INFERRED]
  equivalence/eq/adapters/tests/test_adapters.py → equivalence/eq/adapters/base.py

## Import Cycles
- None detected.

## Communities (99 total, 20 thin omitted)

### Community 0 - "test_dsl.py"
Cohesion: 0.06
Nodes (50): BaseModel, Scenario DSL: YAML schema + loader for equivalence runs (ticket C1)., _clean_msg(), _format_loc(), parse_scenario(), Any, Exception, YAML loading + error formatting for scenario files. Every validation issue is… (+42 more)

### Community 1 - "client.ts"
Cohesion: 0.11
Nodes (14): main(), AutomationClient, AutomationClientOptions, automationPortFromEnv(), AutomationRequest, ClientStatus, CommandHandler, hello() (+6 more)

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
Nodes (5): _empty_state(), MockAdapter, Any, Image, _round3()

### Community 7 - "required"
Cohesion: 0.09
Nodes (22): required, items, type, labels, angleDeg, depth, elevation, floorThickness (+14 more)

### Community 8 - "tauri.conf.json"
Cohesion: 0.09
Nodes (22): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+14 more)

### Community 9 - "required"
Cohesion: 0.12
Nodes (17): enum, required, capabilities, dimensionLine, dimensionLines, furniture, label, labels (+9 more)

### Community 10 - "properties"
Cohesion: 0.15
Nodes (17): type, $ref, properties, default, $ref, fixedSize, fovDeg, pitchDeg (+9 more)

### Community 11 - "Homely Build Plan — Multi-Agent Coordination"
Cohesion: 0.12
Nodes (15): Board rules, Claim Board, clone-dev, driver-dev, harness-dev, Homely Build Plan — Multi-Agent Coordination, integrator (grace) — reference, Kickoff prompts (paste into each agent terminal) (+7 more)

### Community 12 - "test_adapters.py"
Cohesion: 0.15
Nodes (23): Draft202012Validator, fixture, Tests for eq.adapters: mock protocol implementation, automation server, and the…, run(), test_mock_camera_presets_match_reference_defaults(), test_mock_copy_paste_creates_offset_clone_and_updates_selection(), test_mock_create_room_scenario_end_to_end(), test_mock_empty_state_validates_against_frozen_schema() (+15 more)

### Community 13 - "null"
Cohesion: 0.11
Nodes (23): type, type, type, lengthNullable, radianNullable, ref, description, type (+15 more)

### Community 14 - "home-project.schema.json"
Cohesion: 0.11
Nodes (17): description, type, description, $defs, angle, colorNullable, length, lengthPositive (+9 more)

### Community 15 - "Commands"
Cohesion: 0.17
Nodes (11): Commands, Determinism requirements (both apps), Editing actions (map to SH3D ActionType / clone commands), Envelope, Furniture, Homely Automation WebSocket Protocol v1, Introspection & capture, Lifecycle (+3 more)

### Community 16 - "properties"
Cohesion: 0.04
Nodes (52): $ref, $ref, $ref, $ref, $ref, $ref, $ref, $ref (+44 more)

### Community 17 - "cameras"
Cohesion: 0.20
Nodes (10): properties, required, type, type, cameras, observer, top, type (+2 more)

### Community 18 - "capabilities"
Cohesion: 0.20
Nodes (10): type, type, properties, required, type, canRedo, canUndo, capabilities (+2 more)

### Community 19 - "StorageAdapter"
Cohesion: 0.27
Nodes (3): TauriFsStorage, StorageAdapter, StorageUnavailableError

### Community 20 - "AdapterError"
Cohesion: 0.11
Nodes (13): ABC, AdapterError, Exception, Adapter abstraction over the automation surfaces (ws-protocol.md v1). Every…, An adapter answered ok=false (or a request failed transport-side)., Any, HomelyAdapter: wraps an AutomationServer session behind the Adapter ABC. The…, Orchestrator-side automation server (ws-protocol.md v1). Adapters connect TO… (+5 more)

### Community 21 - "HomeModel"
Cohesion: 0.11
Nodes (14): DimensionLine, Furniture, Label, Room, Wall, assert(), HomeModel, requireFinite() (+6 more)

### Community 22 - "properties"
Cohesion: 0.17
Nodes (12): properties, type, $ref, $ref, environment, groundColor, lightColor, skyColor (+4 more)

### Community 23 - "top-camera-follower.ts"
Cohesion: 0.13
Nodes (21): AERIAL_MIN_BOX_CM, AERIAL_MIN_HEIGHT_CM, atVisibleLevel(), Bounds3D, computeHomeBounds(), contentFingerprint(), endpoint(), findJoin() (+13 more)

### Community 24 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 25 - "Architecture Map - SH3D to Homely + Equivalence Harness"
Cohesion: 0.25
Nodes (7): 1. Original application (Sweet Home 3D 7.5), 2. Clone (homely/) target design, 3. Equivalence harness (equivalence/eq/), 4. sh3d-driver (equivalence/driver-java/), 5. Test levels, 6. Environment facts (verified 2026-08-24), Architecture Map - SH3D to Homely + Equivalence Harness

### Community 26 - "AutomationServer"
Cohesion: 0.17
Nodes (14): HomelyAdapter, AutomationServer, Listens on ephemeral WebSocket + TCP ports until `stop()`., Sh3dAdapter, Fake-transport tests for the live adapters (C6): Sh3dAdapter against an in-…, run(), test_homely_adapter_adopts_hello_session_and_round_trips(), test_homely_adapter_error_response_raises_adapter_error() (+6 more)

### Community 27 - "main.ts"
Cohesion: 0.15
Nodes (15): automationPortFromSearch(), connectAutomation(), ctx, engine, eventModelPoint(), frame(), pointer, PointerState (+7 more)

### Community 28 - "default.json"
Cohesion: 0.29
Nodes (6): identifier, permissions, $schema, windows, core:default, main

### Community 29 - "capture.ts"
Cohesion: 0.14
Nodes (12): BrowserCaptureBackend, canvasToPngBase64(), CaptureBackend, MAX_CAPTURE_DIM, requireDim(), ScreenshotRequest, ScreenshotResult, ScreenshotView (+4 more)

### Community 30 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "AGENTS_STEWARD — house_designer workspace"
Cohesion: 0.40
Nodes (4): AGENTS_STEWARD — house_designer workspace, Coordination protocol, Key facts (from architecture research — do not re-derive), Layout & ownership (STRICT)

### Community 33 - "PlanEngine"
Cohesion: 0.12
Nodes (13): syncToolbar(), PlanEngine, samePoint(), Segment, distance(), distToSegment(), isClockwise(), normalizeClockwise() (+5 more)

### Community 34 - "properties"
Cohesion: 0.07
Nodes (34): items, type, items, type, items, maxItems, minItems, type (+26 more)

### Community 35 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 36 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 37 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 38 - "homely-handler.ts"
Cohesion: 0.16
Nodes (17): CAMERA_FIELDS, COMMANDS, ModelError, NEW_WALL_THICKNESS_CM, ClickInput, DragInput, PIXEL_MARGIN, PLAN_SCALE (+9 more)

### Community 39 - "view3d.test.ts"
Cohesion: 0.18
Nodes (15): CameraPatch, CameraPresetName, buildScene(), DEFAULT_FLOOR_COLOR, DEFAULT_FURNITURE_COLOR, DEFAULT_WALL_COLOR, elevationFor(), furnitureMesh() (+7 more)

### Community 40 - "runner.py"
Cohesion: 0.05
Nodes (64): main(), _parse_target(), ``python -m eq.reporting`` CLI and the repo-root ``test-equivalence`` tool.…, ``--target linux,tauri`` → ({"linux"}, {"tauri"}); ``*`` means all., _failure_lines(), _fmt(), Any, Markdown rendering of a suite aggregate, with verbosity levels. - level 0:… (+56 more)

### Community 41 - "properties"
Cohesion: 0.13
Nodes (15): properties, type, $ref, type, type, $ref, compass, diameter (+7 more)

### Community 43 - "sh3d-driver (Track A)"
Cohesion: 0.13
Nodes (14): Boot recipe (why it works without `SweetHome3D.init()`), Build & run, Layout, Notes / limitations, Protocol surface (A1), Protocol surface (A2 interact), Protocol surface (A3 full state export), Protocol surface (A4 capture-io) (+6 more)

### Community 44 - "homely"
Cohesion: 0.22
Nodes (8): Automation protocol (v1), Core model (B2), Empty-home defaults, homely, Layout, Legal note, Prerequisites, Quickstart

### Community 45 - "build_id_map"
Cohesion: 0.18
Nodes (16): build_id_map(), _creation_orders(), _ids_in(), _pair_by_ordinal(), Any, Cross-adapter object identity matching. Adapter-assigned ids are opaque (sh3d…, Match object identities between two states. Strategy per collection: 1. ledger…, adapter -> collection -> [ids in creation order]. (+8 more)

### Community 46 - "rollDeg"
Cohesion: 0.67
Nodes (3): rollDeg, default, $ref

### Community 47 - "required"
Cohesion: 0.43
Nodes (8): required, required, fovDeg, pitchDeg, x, y, yawDeg, z

### Community 48 - "enum"
Cohesion: 0.29
Nodes (7): enum, type, lens, FISHEYE, NORMAL, PINHOLE, SPHERICAL

### Community 49 - "FakeFramedServer"
Cohesion: 0.22
Nodes (4): FakeFramedServer, StreamReader, StreamWriter, In-process stand-in for driver-java FramedServer: hello line on accept, then…

### Community 53 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, preview, smoke, tauri (+1 more)

### Community 54 - "engineering-manager.md"
Cohesion: 0.33
Nodes (5): Completion, Constraints, Failure recovery, Operating loop (repeat until board is done), Startup

### Community 55 - "package.json"
Cohesion: 0.25
Nodes (7): allowScripts, esbuild@0.25.12, esbuild@0.28.2, name, private, type, version

### Community 56 - "Adapter"
Cohesion: 0.20
Nodes (6): main(), Adapter, Any, One automation endpoint participating in a lockstep run. `name` is the instance…, Send one command envelope; return response data or raise AdapterError., Socket

### Community 57 - "1. Top camera follower (B7)"
Cohesion: 0.20
Nodes (9): 1. Top camera follower (B7), 2. State export rounding & angles (B8), 3. Defaults parity (B8), 4. Comparator normalization (C8), Algorithm (per event), Bounds rules, Numeric verification (4-wall script, magnetism off), SH3D top-camera follower & state-export contract (+1 more)

### Community 58 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @tauri-apps/api, three, @types/three, @tauri-apps/api, three, @types/three

### Community 60 - "model.ts"
Cohesion: 0.17
Nodes (14): ActiveTool, CamerasState, CapabilitiesState, CompassState, DEFAULT_WALL_HEIGHT_CM, EnvironmentState, Level, OBSERVER_CAMERA_ID (+6 more)

### Community 61 - "ceilingVisible"
Cohesion: 0.67
Nodes (3): default, type, ceilingVisible

### Community 62 - "._register"
Cohesion: 0.25
Nodes (4): Any, StreamReader, StreamWriter, ServerConnection

### Community 63 - "comparators/__init__.py"
Cohesion: 0.28
Nodes (14): Comparators: state deep-diff, ledger object matching, metrics, assertions.…, _flatten(), geometry_summary(), metric_deltas(), polygon_area(), polygon_perimeter(), Any, Geometry metrics for quick triage of equivalence failures. Where the deep diff… (+6 more)

### Community 64 - "floorVisible"
Cohesion: 0.67
Nodes (3): default, type, floorVisible

### Community 65 - "export.test.ts"
Cohesion: 0.14
Nodes (23): default, type, doorOrWindow, COMPASS_FALLBACK_ZONE, compassDegreesForZone(), compassRadiansForZone(), resolveTimezone(), toRadiansAsJavaFloat() (+15 more)

### Community 66 - "SH3D plan-tool behaviours (observed, for clone parity)"
Cohesion: 0.33
Nodes (5): Automation protocol notes (for orchestrator-side consumers), Clone-side protocol deviations (pending integrator amendment), Model/interaction facts, SH3D plan-tool behaviours (observed, for clone parity), Wall tool state machine (what B3 plan-view must replicate)

### Community 67 - "HomeStore"
Cohesion: 0.18
Nodes (7): argIdx, CommandResult, HomelyCommandHandler, requireNumber(), createEmptyHome(), NormalizedHomeState, HomeStore

### Community 68 - "drawPlan"
Cohesion: 0.09
Nodes (5): cssColor(), drawPlan(), PlanRenderingContext, ViewMapper, RecordingPlanContext

### Community 69 - "compare_images"
Cohesion: 0.16
Nodes (13): test_visual_diff_identical_pair_matches(), test_visual_diff_known_different_pair_scores_and_heatmaps(), test_visual_diff_size_mismatch_never_matches(), test_visual_diff_threshold_breach_flips_verdict(), compare_images(), _load_png(), Any, Image (+5 more)

### Community 70 - "evaluate_assertion"
Cohesion: 0.21
Nodes (14): _bool_int_clash(), _check(), evaluate_assertion(), evaluate_assertions(), Any, Evaluation of scenario assertions against captured artifacts. Assertions come…, Evaluate all manifest assertions; returns ``{records, passed, counts}``., Resolve a dotted path like ``walls.0.xStart`` or ``walls[0].xStart``. Returns… (+6 more)

### Community 71 - "CameraDirector"
Cohesion: 0.32
Nodes (3): CameraState, ObserverCameraState, CameraDirector

### Community 75 - "automation_port"
Cohesion: 0.40
Nodes (3): automation_port(), Option, String

### Community 79 - "test_comparators.py"
Cohesion: 0.18
Nodes (18): deep_diff(), Recursively diff two JSON-like documents. Numbers are compared with the…, _png(), Tests for eq.comparators: diff, matching, metrics, assertions, run., Known-different PNG pair: plain white vs white with a red 8x8 block., test_absent_key_vs_real_value_still_fails(), test_angle_tolerance_applies_to_deg_fields(), test_color_fields_compare_exactly() (+10 more)

### Community 80 - "IdMap"
Cohesion: 0.36
Nodes (4): IdMap, Maps expected-side (reference) ids to actual-side ids., Return a copy of ``state`` with ids renamed into reference-id space., test_idmap_inverse_helpers_and_lookup()

### Community 86 - "load_scenario"
Cohesion: 0.12
Nodes (24): main(), Path, Demo entry point for C2 DoD: execute a scenario YAML against two MockAdapters…, _run(), Adapter layer + orchestrator for the equivalence harness (Track C)., MockAdapter: deterministic in-process reference implementation of the…, build_mock_adapters(), _collect_ids() (+16 more)

### Community 87 - "compare_states"
Cohesion: 0.28
Nodes (13): compare_states(), _diff(), _diff_collections(), Failure, _is_number(), _item_id(), _leaf(), Any (+5 more)

### Community 89 - "areaVisible"
Cohesion: 0.67
Nodes (3): default, type, areaVisible

### Community 91 - "run.py"
Cohesion: 0.29
Nodes (10): compare_artifacts(), _load(), Any, Path, Artifact-level comparison: turn one orchestrator run into a verdict. Reads…, Compare a run directory and persist ``comparison.json`` beside it., Compare all captured states + assertions of one run directory., write_comparison() (+2 more)

### Community 217 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **355 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `$schema`, `$id`, `title` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `properties` connect `properties` to `floorVisible`, `export.test.ts`, `properties`, `required`, `properties`, `properties`, `null`, `rollDeg`, `areaVisible`, `ceilingVisible`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `doorOrWindow` connect `export.test.ts` to `properties`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `MockAdapter` (e.g. with `AdapterError` and `test_build_mock_adapters_covers_sh3d_plus_target_modes()`) actually correct?**
  _`MockAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `AdapterError` (e.g. with `HomelyAdapter` and `MockAdapter`) actually correct?**
  _`AdapterError` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `$schema` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `test_dsl.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06345848757271286 - nodes in this community are weakly interconnected._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._