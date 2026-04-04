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
- When creating new components, try to indentify an exemplar that you can copy and compare with the exemplar at each step.
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
- **Schema:** ECHO `Spacetime.Scene` type with `org.dxos.type.spacetime.scene` typename.

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

### Phase 2

- [ ] Persist geometry state to ECHO (serialize/deserialize Manifold mesh data).
- [ ] Multi-operation history: support undo/redo of extrusions and boolean ops.
- [ ] Face selection improvements: highlight individual face (not whole mesh), multi-face select.
- [ ] Boolean operations toolbar: union, difference, intersection between selected solids.

### Phase 3

- [ ] Additional solid primitives: sphere, cylinder, torus.
- [ ] Transform gizmos: translate, rotate, scale selected solids.
- [ ] Material/color picker per solid or per face.
- [ ] Export: OBJ/STL/glTF mesh export from Manifold geometry.
- [ ] Real-time collaboration: sync scene state across peers via ECHO.

## Design Notes

Keep this section up-to-date.

## Issues

Keep this section up-to-date.
