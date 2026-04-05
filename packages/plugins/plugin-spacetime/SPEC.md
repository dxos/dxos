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

### Phase 1

- [x] Decide on the best Typescript 3d engine to use for the plugin — **Babylon.js** (`@babylonjs/core`)
  - Chosen for: native TypeScript, built-in scene picking, CSG gizmos, WebGPU-ready.
- [x] Decide on the topology library — **Manifold** (`manifold-3d`)
  - Chosen for: fast boolean operations (~1MB WASM), clean API, watertight output guarantees.
  - OpenCascade.js deferred to future phases if BREP/parametric features needed.
- [x] Create the basic plugin structure, incl. types, settings, and components.
- [x] Create a minimal storybook-driven experiment that renders a cube and allows the user to extrude surfaces.
  - [x] The user should be able to rotate the scene.
  - [x] The user should be able to click on a surface to select it.
  - [x] The user should be able to extrude the selected surface by holding shift and moving the mouse.
- [x] Create ECHO types for: `Scene.Scene`, `Model.Object`, and `Settings.Settings` (in `./types`);
  - [x] SpacetimeArticle should be bound to a `Scene.Scene` object; when creating a Scene from composer it should create a default cube.
  - [x] `Scene.Scene` should contain a map of `Model.Object` objects.
- [x] Create a Settings component like other plugins.
- [x] Add the plugin to composer.

### Phase 2

- [ ] Implement 3d grid with snap and minimum size.
- [ ] Boolean operations toolbar: union, difference, intersection between selected solids.
- [ ] Multi-operation history: support undo/redo of extrusions and boolean ops.
- [ ] Additional solid primitives: sphere, cylinder, torus.
- [ ] Transform gizmos: translate, rotate, scale selected solids.
- [ ] Material/color picker per solid or per face.
- [ ] Export: OBJ/STL/glTF mesh export from Manifold geometry.
- [ ] Real-time collaboration: sync scene state across peers via ECHO.
- [ ] Face selection improvements: highlight individual face (not whole mesh), multi-face select.

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

### Manifold ↔ Babylon.js Integration

- Manifold uses CCW triangle winding; Babylon.js uses CW for front faces. The mesh converter swaps vertex order.
- Flat shading is achieved by unsharing vertices (3 unique vertices per triangle with face normal).
- Scene background reads from `document.body` computed `backgroundColor` to respect the DXOS theme (light/dark mode).

## Issues

Keep this section up-to-date.
