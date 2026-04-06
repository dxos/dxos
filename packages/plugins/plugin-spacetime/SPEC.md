# Spacetime Plugin Specification

## Instructions

- This is a complex project. Think deeply about these tasks and create a plan.
- Update these instructions to record any changes requested by the user.

### Workflow

- Use this document to track progress with the user.
- Work only on the section of the document/plan that you are directed to work on.
- After each step, check everything builds, then format, lint, commit and push.
- If we are trying to land a PR monitor CI and address ALL PR comments and CI errors.
- Use this document to record any complex issues and decisions, or places where you needed additional instructions.
- Before starting a complex task, first read all of the instructions and do your research then ask the user questions that help clarify the scope.

### SDK

- Consider at all times how to best use the DXOS SDK (esp. `@dxos/echo` and plugin standards.)
- When creating new components, try to identify an exemplar that you can copy and compare with the exemplar at each step.
  - Example: complex react components should use the Radix-composition pattern (see `Dialog.tsx`).
  - Example: container components should implement `composable` (see `slots.stories.tsx`).
  - If in doubt, ask the user for an exemplar.

## Background

- Spacetime is a generative 3D modeling and animation plugin for DXOS.

## Specification

Keep this section up-to-date with periodical restructuring as the plugin becomes more complex.

### Tech Stack

- **Rendering:** Babylon.js (`@babylonjs/core`) — scene, camera, lighting, picking.
- **Geometry:** Manifold (`manifold-3d`) — solid modeling via WASM, boolean operations.
- **Schema:** ECHO `Scene.Scene` type with `org.dxos.type.Scene.Scene` typename.

### Functionality

- Plugin scaffold: metadata, ECHO schema, translations, React surface capability.
- Babylon.js scene manager with ArcRotateCamera orbit controls.
- Manifold WASM singleton loader (lazy, async).
- Manifold-to-Babylon mesh converter (positions, normals, indices).
- SpacetimeEditor component: renders centered cube, face picking with highlight, shift-drag extrusion via Manifold boolean union.
- Storybook story (fullscreen).

## Implementation

### Phase 1 (Basic)

- [x] Decide on the best Typescript 3d engine to use for the plugin — **Babylon.js** (`@babylonjs/core`)
  - Chosen for: native TypeScript, built-in scene picking, CSG gizmos, WebGPU-ready.
- [x] Decide on the topology library — **Manifold** (`manifold-3d`)
  - Chosen for: fast boolean operations (~1MB WASM), clean API, watertight output guarantees.
  - OpenCascade.js deferred to future phases if BREP/parametric features needed.
- [x] Create the basic plugin structure, incl. types, settings, and components.
- [x] Create a minimal storybook-driven experiment that renders a cube.
  - [x] The user should be able to rotate the scene.
  - [x] The user should be able to click on a surface to select it.
  - [x] The user should be able to extrude the selected surface by holding shift and moving the mouse.
- [x] Create ECHO types for: `Scene.Scene`, `Model.Object`, and `Settings.Settings` (in `./types`);
  - [x] SpacetimeArticle should be bound to a `Scene.Scene` object; when creating a Scene from composer it should create a default cube.
  - [x] `Scene.Scene` should contain a map of `Model.Object` objects.
- [x] Create a Settings component like other plugins.
- [x] Add the plugin to composer.

### Phase 2 (Tools)

Design a mechanism for tools.
We should aim not to complicate further the SpacetimeCanvas.
Instead implement tool handlers that operate on the runtime properties and then update the model once the action (e.g., dragging) has completed.

- [x] When the move tool is selected, dragging on an object should move it relative to the ground plane.
- [x] When a facet is selected and the extrusion tool is selected, dragging should extrude the facet and update the object model once the dragging completes.
- [x] Show the ground plane as a transparent grid.
- [x] Implement pinch zoom.
- [x] Add a menu toggle group to select either objects or faces.
  - Selection mode toggle (object/face) in toolbar via `view.ts` `createSelectionModeActions`.
  - `Selection` type is a discriminated union: `ObjectSelection | FaceSelection`.
  - Object mode shows wireframe bounding box; face mode shows coplanar face overlay.
- [x] Menu action to toggle visibility of ground plane.
  - View toggle group in toolbar via `view.ts` `createViewActions`.
  - `ViewState.showGrid` synced to `SceneManager.showGrid` via canvas effect.
- [x] Menu action and operation to create a new cube.
  - `EditorActions.onAddObject` in `actions.ts`, wired through editor context.
  - Creates `Model.Object` via `Model.make()`, adds `Ref` to scene via `Obj.change`.
  - Canvas subscribes to `objectCount` (via `useObject` on scene) and syncs new meshes reactively.
- [x] Menu action and operation to delete the selected object.
- [x] Show wireframe bounding box for selected object.
- [x] Show table of vectors.
- [x] Snap objects when dragging (moving).

### Phase 3

- [x] Additional solid primitives: sphere, cylinder, pyramid, torus; Add toolbar <Select> to choose solid that is added by the add object operation.
  - Primitive dropdown with applyActive showing selected icon. Pyramid via Manifold.cylinder(radiusHigh=0, 4 segments).
- [x] Find 3 basic open source files to import (as presets) and test with; add these to the package files; Add these as options to the <Select>
  - Downloaded box.glb, duck.glb to src/assets/. Need GLB→Manifold import pipeline.
- [x] Export: STL mesh export from Manifold geometry.
  - Binary STL exporter in engine/stl-export.ts. Export button in toolbar, downloads selected object.
- [x] Import: GLB/OBJ file import as new scene objects.

### Phase 4 (Boolean geometry)

- [x] Key shortcuts: m => move, e => extrude, x / backspace => delete
      Local canvas keydown listener (scoped to canvas focus, skips text inputs).
- [x] When the moving objects, if the CMD key is held move in the Z axis (up/down) rather then X/Y (ground plane).
      Uses metaKey (macOS) or altKey (Windows/Linux); vertical drag projects onto camera-facing plane.
- [x] Unit test to join/merge two mesh objects into a new single mesh object.
      `boolean-ops.test.ts`: 4 tests for joinSolids (overlapping, non-overlapping, 3 cubes, position).
- [x] Unit test to subtract one mesh object from another and create a new single mesh object.
      `boolean-ops.test.ts`: 4 tests for subtractSolids (overlapping, A-B-C, non-overlapping, position).
- [x] Mult-select if holding shift when clicking (ordered list of objects)
      MultiObjectSelection type with ordered entries; toggle in/out via shift-click in object mode.
- [x] Support moving all selected objects
      MoveTool tracks companions from multi-selection; applies same delta to all on drag.
- [x] Menu action to join selected objects.
      Toolbar button with `ph--unite-square--regular` icon. Deletes sources, creates merged object.
- [x] Menu action to subtract selected objects.
      Toolbar button with `ph--subtract-square--regular` icon. A - B - C ordered difference.

### Phase 5

- [ ] Multi-operation history: support undo/redo of extrusions and boolean ops.
- [ ] Boolean operations toolbar: union, difference, intersection between selected solids.
- [ ] Transform gizmos: translate, rotate, scale selected solids.
- [ ] Material/color picker per solid or per face.

## Design Notes

Keep this section up-to-date.

### WASM Bundling (manifold-3d)

The `manifold-3d` package ships a `manifold.wasm` binary (~1MB) that must be loadable at runtime. The default loading mechanism uses `new URL("manifold.wasm", import.meta.url)` which breaks when Vite/Storybook pre-bundles the module (the `.wasm` file is not copied to the dep cache).

**Current solution:**

1. `manifold-3d` is excluded from Vite's `optimizeDeps` in `tools/storybook-react/.storybook/main.ts` so Vite serves it directly from `node_modules`.
2. `engine/manifold-context.ts` imports the WASM URL via `import wasmUrl from 'manifold-3d/manifold.wasm?url'` (Vite `?url` suffix) and passes it to the module init via `locateFile`.
3. `wasm.setup()` must be called after init to register the high-level API (`Manifold.cube`, `Manifold.union`, etc.).

**For Composer (production app):**

- The `vite-plugin-wasm` plugin is already configured in the Vite pipeline.
- `manifold-3d` must be excluded from `optimizeDeps.exclude` in the Composer Vite config (same as storybook).
- The `?url` import ensures Vite copies the `.wasm` file to the build output as a static asset.
- No CDN or external fetch is needed — the WASM is self-contained in the bundle.

### Tool Plugin Architecture

Tools are stateful objects that handle pointer interaction on the Babylon scene. They manipulate Babylon meshes directly during interaction (visual-only), then commit the final state to the ECHO `Model.Object` when the action completes. The canvas remains a renderer — it reads ECHO state, renders meshes, and delegates all pointer events to the active tool.

**Separation of concerns:**

- **Canvas** renders ECHO state and delegates pointer events to the `ToolManager`.
- **Tools** handle interaction logic, manipulate Babylon runtime, and commit to ECHO on completion.
- **Toolbar** selects the active tool via the editor context; it is not coupled to tool implementations.

**Key interfaces:**

```
ToolContext {
  scene: BabylonScene         // For visual manipulation during interaction.
  camera: ArcRotateCamera
  canvas: HTMLCanvasElement
  manifold: ManifoldWASM      // For CSG operations (extrude, boolean).
  echoScene: Scene.Scene      // For committing changes on action completion.
  meshes: Map<string, Mesh>   // ECHO object id → Babylon mesh.
  getObject(id) → Model.Object
}

Tool {
  id: string
  activate(ctx)               // Set up gizmos, cursors.
  deactivate(ctx)             // Clean up.
  onPointerDown(ctx, info) → boolean
  onPointerMove(ctx, info) → boolean
  onPointerUp(ctx, info) → boolean
}

ToolManager {
  register(tool)
  setContext(ctx)
  setActiveTool(id)
  handlePointer(info) → boolean
  dispose()
}
```

**Data flow:**

```
Pointer Event → Canvas Observer → ToolManager.handlePointer()
                                        │
                                  Active Tool
                                        │
                          ┌─────────────┼──────────────┐
                          ▼             ▼              ▼
                    onPointerDown  onPointerMove  onPointerUp
                    (pick mesh,    (manipulate     (commit to
                     start drag)    Babylon mesh)   ECHO Model.Object)
```

During drag: tools call `mesh.position.set(...)` directly — no ECHO writes, no network replication.
On pointer-up: tools call `Obj.change(obj, ...)` — single atomic ECHO mutation, replicates once.

**Geometry persistence:**
`Model.Object` stores both a `primitive` type and an optional `geometry` field (serialized Manifold mesh data). Objects start as primitives; after CSG operations (e.g., extrude) the result is serialized into `geometry`, and the object is no longer a simple primitive.

**Undo integration point:**
The tool commit (pointer-up) is the natural boundary for undo entries. Each commit can push `{ objectId, before, after }` onto an undo stack. This is why visual manipulation is separated from model commit — the commit is a single atomic operation that can be reversed.

**File structure:**

```
src/tools/
  index.ts           — barrel exports
  tool.ts            — Tool interface
  tool-context.ts    — ToolContext type, Selection type
  tool-manager.ts    — ToolManager class
  select-tool.ts     — face picking + highlight (extracted from canvas)
  move-tool.ts       — drag to translate object
  extrude-tool.ts    — face extrude via Manifold CSG
```

### Selection Model

Selection data is separate from selection visuals. The `Selection` type is a discriminated union that supports different granularities:

```
SelectionBase { objectId: string }

ObjectSelection  = SelectionBase & { type: 'object' }
FaceSelection    = SelectionBase & { type: 'face'; faceId; normal }
EdgeSelection    = SelectionBase & { type: 'edge'; edgeId }
VertexSelection  = SelectionBase & { type: 'vertex'; vertexId }
GroupSelection   = { type: 'group'; objectIds: string[] }

Selection = ObjectSelection | FaceSelection | EdgeSelection | VertexSelection | GroupSelection
```

**Current implementation:** Selection stores data + a highlight mesh parented to the object mesh (so it follows transforms). Tools write selection via `ctx.setSelection(data)` which disposes the old highlight automatically.

**Future: SelectionOverlay class.**

- `SelectionOverlay` manages the visual separately from the data:
- `update(selection, ctx)` — rebuild highlight from current mesh vertex data.
- `sync(ctx)` — called per-frame or after transforms to keep visuals aligned.
- `dispose()` — clean up.

This enables:

- Object selection → bounding box wireframe that tracks the mesh.
- Face selection → coplanar triangle overlay (current behavior).
- Edge/vertex selection → point or line highlight.
- Group selection → multiple bounding boxes.

Selection is invalidated after geometry-changing operations (extrude) since face/edge/vertex ids change.

### Manifold ↔ Babylon.js Integration

- Manifold uses CCW triangle winding; Babylon.js uses CW for front faces. The mesh converter swaps vertex order.
- Flat shading is achieved by unsharing vertices (3 unique vertices per triangle with face normal).
- Scene background reads from `document.body` computed `backgroundColor` to respect the DXOS theme (light/dark mode).

## Issues

Keep this section up-to-date.
