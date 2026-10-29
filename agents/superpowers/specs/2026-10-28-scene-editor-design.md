# Scene editor (stage 3): common editing for 2D and 3D

Status: all questions decided 2026-10-29; plan `agents/superpowers/plans/2026-10-29-scene-editor-stage-3.md` (21 tasks, rewritten for 14) awaits review. Nothing in it is built. It follows stage 2
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
9. (2026-10-29) The 3D viewer orbits, zooms and pans; inside an animator stage the animation drives the camera. An
   editor's camera is the viewer's own view state (react-ui-attention); orbiting never writes the scene's camera, which
   is the authored view.
10. (2026-10-29) Every drawing is a `Drawing` (one query finds them all; formats convert into one another). Its
    existing `canvas` Ref is widened: it names either the unchanged `Drawing.Canvas` (tldraw and excalidraw drawings,
    which neither change nor migrate) or plugin-canvas's typed `Canvas`. That `Canvas` holds its metadata, including
    named style classes, and `Canvas.content` is a Ref to a `Scene2D` or `Scene3D`. Only `dxos.org/scene/2` drawings
    migrate, to a `Canvas` plus a `Scene2D`. This replaces 6's "root Ref" wording; the editor still picks the viewport
    from the scene's type.
11. (2026-10-29) Elements share a `BaseElement` type; a 3D element's location is `center`, as in 2D; both dimensions
    share one generic `Scene<E, C>` type.
12. (2026-10-29) plugin-spacetime is deleted within stage 3 once each of its tools has a test in the new editor.
13. (2026-10-29) plugin-canvas switches to `Scene2D` only when every react-ui-canvas mode runs on it: free, lattice,
    constrained and scored.
14. (2026-10-29) A drawing has three aspects (spec D-27..D-30): a **Model** of reusable objects, **Layouts** of
    positioned elements that place them (or define a kind inline), and **Scenes**, each a layout plus a camera.
    plugin-canvas's `Canvas` holds the model, its layouts and its scenes (`model?: Ref<Model>`,
    `layouts: Ref<Layout>[]`, `scenes: Ref<Scene>[]`), which replaces 10's `Canvas.content`. Child scenes are
    composite objects whose `parts` is a nested layout; playback samples a scene's layout and never writes it back.
    The group arranger type is `Arrangement`. Wherever this document says a scene holds elements, read: its layout.

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

react-ui-canvas's `View` model is backed by `Layout2D`: a View is a layout (its camera a `Scene2D`), nodes and links are
elements, a link's endpoints are bindings, a composite is a model object with parts, `z` is `order`. The engine's
stores, atoms, projections and undo keep their shape; a store over `Layout2D` objects replaces the content-record
store, and the viewport camera starts at the open `Scene2D`'s authored camera; the viewer's own camera is their view
state and is never written to the scene. Several scenes over one layout are saved views of one drawing.

### 2. One intent vocabulary, geometry per dimension

Layout intents (`LayoutIntent`) name elements by id and are shared: `create`, `delete`, `update(path, value)`, `reorder`, `group`, `ungroup`,
`bind`, `group` with an `arrange`. Geometric intents carry the scene type's values: `move` (a `Vec2` or `Vec3` delta), `scale`,
`rotate`. One reducer handles the shared intents; each dimension supplies the geometric ones. Undo stays
`VersionedSource` over the layout's records, so 2D and 3D undo work the same way.

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
`props` schema drive it in both dimensions. Layers work unchanged; Views lists the canvas's scenes. A Library panel lists the model's
objects and is in stage 3 (the agent's call: the Model exists, so it is cheap, and use case 6 needs it); model edits
are `ModelIntent`s.

### 5. Migration

A migration reads `Drawing.Canvas` content (revision `dxos.org/scene/2`) and writes a `Canvas` with one Layout2D and one
Scene2D per View, and a Model2D whose composite objects hold the views that nested views referenced as parts. It runs
before plugin-canvas switches over, and its tests run the `.dx` corpus through both forms.

### 6. Order of work

1. **Model switch:** react-ui-canvas on Layout2D and Scene2D, with the migration, at parity with today's canvas.
2. **3D viewport and arranging:** the Babylon viewport, picking, select, move/rotate/scale gizmos, group, link, undo.
3. **Solid tools:** extrude, join, subtract, GLB/OBJ import, STL export. plugin-spacetime is then retired.
4. **Assistant:** `ReadScene`/`EditScene` over a canvas's whole `.dx` document (scenes, layouts, models), and a skill
   (use case 7). The illustrator `Read`/`Edit` operations keep speaking the diagram DSL, reaching a canvas through its
   builder.

## Open questions for the user

None. The last three were decided on 2026-10-29 (10–12 above).

## Not in scope

Effects authoring, the Library's code effects (use case 6 beyond listing components), export to studio (plugin-animator
phase 4), and EDGE rendering.
