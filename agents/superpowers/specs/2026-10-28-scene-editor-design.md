# Scene editor (stage 3): common editing for 2D and 3D

Status: draft; four questions decided 2026-10-29, three open with provisional defaults; plan in progress. Nothing in it is built. It follows stage 2
(`2026-10-28-scene-model-design.md`), which built the Scene model, its `.dx` form, the renderers and the animator
stages.

## Intent

One editor edits both 2D drawings and 3D scenes, on the Scene model. It grows inside plugin-canvas, so that today's
canvas becomes its 2D case and plugin-spacetime can be retired.

## Decided by the user (2026-10-28)

1. The editor grows inside plugin-canvas; no new editor plugin.
2. 3D editing starts with arranging parts: place, move, rotate, scale, group and link. Extrude and join/subtract come
   after.
3. Existing canvases are migrated to Scene/Element within stage 3, before plugin-canvas switches to the new model.
4. The work stays in dxos/dxos#14282.
5. (2026-10-29) The plugin still owns a canvas object, for its additional metadata, but the mechanism (editor,
   renderers, animator stages) depends only on `Scene`.
6. (2026-10-29) One canvas object type for both dimensions: its root Ref points at a Scene2D or a Scene3D, and the
   editor picks the viewport from the root. A 3D canvas is a creation option, not a separate type.
7. (2026-10-29) Assistant operations are in stage 3, as its last step (§6.4).
8. (2026-10-29) 3D handles are Babylon's `GizmoManager`.
9. (2026-10-29) The 3D viewer orbits, zooms and pans; inside an animator stage the animation drives the camera.

## What exists to build on

- **react-ui-canvas** has the editor shell: `Canvas.Root`, a viewport, a palette, the select/hand/node/link tools, the
  Properties, Layers, Views and Objects inspectors, a pure `Intent` reducer with `VersionedSource` undo, and a
  `NodeDef` registry. Its model is `View`/`Node`/`Link`, and node rendering is a React component per type.
- **`@dxos/scene`** has the model the editor should edit, and `@dxos/react-ui-scene` draws it: 2D by converting to
  react-ui-canvas Views (`toCanvasViews`), 3D with Babylon (`SceneRenderer3D`).
- **plugin-spacetime** has the 3D tools to replace: select (object or face), move on a plane, extrude, join, subtract,
  GLB/OBJ import and STL export. It has no undo, no rotate or scale, and no assistant operations.

## Proposal (the agent's, for review)

### 1. One model: react-ui-canvas edits Scene records

react-ui-canvas's `View` model becomes `Scene2D`: a View is a scene, nodes and links are elements, a link's endpoints
are bindings, a composite is a component, `z` is `order`. The engine's stores, atoms, projections and undo keep their
shape and change their element type. `toCanvasViews` then disappears: the 2D renderer draws Scene records directly.

### 2. One intent vocabulary, geometry per dimension

Intents name elements by id and are shared: `create`, `delete`, `update(path, value)`, `reorder`, `group`, `ungroup`,
`bind`, `layout`. Geometric intents carry the scene type's values: `move` (a `Vec2` or `Vec3` delta), `scale`,
`rotate`. One reducer handles the shared intents; each dimension supplies the geometric ones. Undo stays
`VersionedSource` over the scene's records, so 2D and 3D undo work the same way.

### 3. Pluggable viewports with one picking contract

The shell hosts a viewport per renderer: today's DOM viewport for 2D, and a Babylon viewport for 3D (and for 2D drawn
in 3D). Each viewport implements one contract the tools use:

- `pick(screenPoint) → { element?, point }`: the element under the pointer and the scene point (2D hit test; 3D
  Babylon picking and a ground-plane intersection);
- `project(point) → screenPoint`, for overlays and labels;
- a camera atom (`Camera2D` or `Camera3D`).

Tools are then written once against the contract: select (with marquee), pan/orbit, create-by-kind, link, group. Move,
rotate and scale are handles: today's 2D handles, and Babylon's `GizmoManager` in 3D.

### 4. Panels stay, and read the schemas

The Properties inspector is already a form over the selection's schema, so `Element2D`/`Element3D` and each kind's
`props` schema drive it in both dimensions. Layers and Views (renamed Scenes) work unchanged. A Library panel lists
components, which use case 6 (custom objects with effects) needs.

### 5. Migration

A migration reads `Drawing.Canvas` content (revision `dxos.org/scene/2`) and writes Scene2D objects, one per View, with
child scenes linked by Ref. It runs before plugin-canvas switches over, and its tests run the `.dx` corpus through
both forms.

### 6. Order of work

1. **Model switch:** react-ui-canvas on Scene2D, with the migration, at parity with today's canvas.
2. **3D viewport and arranging:** the Babylon viewport, picking, select, move/rotate/scale gizmos, group, link, undo.
3. **Solid tools:** extrude, join, subtract, GLB/OBJ import, STL export. plugin-spacetime is then retired.
4. **Assistant:** Read/Edit operations over the `.dx` scene statements, and a skill (use case 7).

## Open questions for the user

The first four were decided on 2026-10-29 (5–8 above). Three remain; the plan proceeds on the **recommended
default** of each, marked provisional, until the user answers.

1. **Which plugin owns the canvas object?** `Drawing.Canvas` lives in plugin-illustrator today.
   1. plugin-canvas owns it, and plugin-illustrator keeps only diagram rendering. _(default)_
   2. plugin-illustrator keeps it, and plugin-canvas contributes the editor surface for it.
2. **What happens to plugin-spacetime at the end of stage 3?**
   1. Delete it once solid tools reach parity, in the same PR series. _(default)_
   2. Mark it deprecated and hide it, and delete it in a later release.
3. **Which react-ui-canvas modes must reach parity on Scene2D in the model switch?**
   1. The free canvas only; lattice, constrained and scored modes move later. _(default)_
   2. Every mode, before plugin-canvas switches over.

## Not in scope

Effects authoring, the Library's code effects (use case 6 beyond listing components), export to studio (plugin-animator
phase 4), and EDGE rendering.
