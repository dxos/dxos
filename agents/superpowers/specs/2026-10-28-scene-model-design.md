# Scene model: one ontology and DSL for 2D and 3D

Status: approved by the user, 2026-10-28; the ontology was revised on 2026-10-29 into Model, Layout and Scene (spec decisions D-27..D-33), which the Ontology and DSL sections below now describe. Calls 12–24 are the agent's, accepted with the design. Stage 2 is built (plan: `agents/superpowers/plans/2026-10-28-scene-model-stage-2.md`, ledger: `packages/common/scene/TASKS.md`); its animator stages live in plugin-canvas, where the user chose to grow the stage 3 editor.

## Intent

Composer has two scene editors that share nothing:

- plugin-canvas (2D) has the cleanest model, a complete MDL spec and an animator stage.
- plugin-spacetime (3D) has solids, CSG and a presentation renderer, but a flat model, no hierarchy, no undo and no
  assistant operations.

The goal is one data structure and one text DSL that describe both 2D and 3D scenes. The editor, the assistant and the
animator all read and write that structure. A common editor core then serves both dimensions, and plugin-spacetime is
retired.

The data structure and the DSL come first. The editor is built on them later.

## Use cases

1. A user creates a hierarchical 2D drawing, as plugin-canvas does today.
2. A user builds a 3D object: solids made by extrusion and CSG, and scenes arranged from parts.
3. A user creates 3D animations, as the echo3d presentation does today.
4. A 3D projection is generated from a 2D canvas.
5. Animations are generated from 2D or 3D scenes and included in plugin-studio.
6. A library of 2D and 3D custom components, some with effects written in code.
7. The assistant generates and edits 2D and 3D scenes through the DSL.

The first end-to-end target is use case 2 on the same core as plugin-canvas, so that plugin-spacetime can be retired.

## Goals, non-goals, anti-goals

Goals:

- One ontology and one DSL, with shared types only where 2D and 3D really share properties.
- A lossless text form, so the assistant and the editor work on the same scene.
- Stable element ids, because animator tracks and DSL edits refer to them.
- Existing plugin-canvas drawings keep opening after migration.

Non-goals:

- Migrating plugin-spacetime data. Spacetime scenes are not migrated.
- Building the common editor in stage 2. Editing tools are stage 3.
- Mixing 2D and 3D elements inside one scene.

Anti-goals (a failure even if it works):

- A single type with optional 2D and 3D fields that most code has to branch on.
- A DSL that only goes one way, where hand edits are lost when the assistant redraws.
- Element ids that shift when another element is added or removed.

## Stages

1. **Review everything.** Done 2026-10-28; findings below.
2. **Exemplars.** Write the exemplar scenes below in the DSL, store them in the model, and render each in 2D or 3D with
   several styles and cameras and a simple animation. This tests the data structure, the terminology and the DSL before
   any editor work.
3. **Common editing tooling.** Decide and build the editor core: canvas, tool and inspector panels, renderers.

This document fixes the ontology and the shape of stage 2. Stage 3 gets its own design after stage 2.

## Review findings (stage 1)

- **plugin-canvas / react-ui-canvas.** A `View` holds `nodes`, `links` and `layers`. A `view` node opens a child View
  with its own coordinate space. A composite View is placed as `instance` nodes with overrides. Editing goes through a
  pure `Intent` reducer with versioned undo. Styles are semantic tokens (`hue`, `tone`, `fill`, `border`, `rounded`)
  resolved by a `Theme`. All geometry is 2D, `z` means paint order, and node rendering is tied to React and the DOM. The
  whole drawing is stored as records in one ECHO object (`Drawing.Canvas.content`). The spec still lists `View.timeline`,
  which no longer exists.
- **`@dxos/diagram` (`.dx`).** One language with two layers. The scene layer (`object`, elements, `move`, `remove`)
  maps one statement to one command and prints back to the same text. The semantic layer (`node`, `edge`, `group`,
  placement hints, relationship words) is compiled by a layout engine into scene commands. Gaps: the semantic source is
  not persisted, edge ids are positional, redraws probably do not emit removals, and everything is 2D.
- **plugin-spacetime.** `Scene` holds a flat list of `Model.Object` (primitive or mesh, Vec3 transform, colour,
  opacity, label) and inline links. Manifold CSG, face extrusion, GLB/OBJ import, STL export, CAD and presentation
  looks, on-demand Babylon rendering, and four arrangers. No hierarchy, no undo, no rotate or scale tools, no assistant
  operations. Two likely bugs: primitive position applied twice in the editor, and editor primitives twice the size the
  stage draws.
- **plugin-animator.** A `StageDef` per ECHO typename supplies targets (stable string ids plus animatable dot paths),
  a camera kind, renderers, arrangers and a binding of plain data for effects. Script property names (`position`,
  `scale`, `opacity`) are per stage. The target id `camera` is reserved.
- **plugin-studio.** No timeline model. The planned animator integration (a `GenerationService` producing an MP4
  `Variant`, or a live `application/vnd.dxos.animation` variant) is not built. The storyboard player only plays variants
  with a `url`.

## Decisions

Decided by the user (2026-10-28):

1. **Share a type only where 2D and 3D share properties.** Embedding one dimension in the other is a separate mechanism
   and is not a reason to share a root type.
2. **No Node/Link split.** Every item in a scene is one kind of record, as in tldraw.
3. **The record is called Element.**
4. **The container is called Scene.**
5. **Reusable parts are Component and Instance.**
6. **A scene is stored as records inside one ECHO object.**
7. **The records are the source of truth.** The DSL is a lossless text form of them.
8. **Existing plugin-canvas drawings are migrated. plugin-spacetime data is not.**
9. **A solid is stored as an operation tree** (union, difference, extrude) over operand elements and recomputed when
   loaded, not as a baked mesh. It stays editable and lossless in text.
10. **Both `group` and child scenes exist.** A group keeps its members in the parent's coordinate space, so links reach
    them directly. A child scene has its own space and is a separate object.
11. **A 2D scene can be rendered through a 3D projection.** The 2D renderer is not the only way to draw a 2D scene.

Filled in by the agent (for review):

12. **Binding.** A link element's ends are Bindings to other elements (element id, optional anchor). Moving an element
    moves what is bound to it. A link's geometry is derived from its bindings.
13. **Element kinds are open.** A kind is registered with its schema and behaviour; each renderer registers its own
    view of a kind. This splits today's `NodeDef.component` into a renderer-neutral definition plus per-renderer views.
14. **Paint order is `order`, not `z`,** so that `z` can mean depth.
15. **Layout intent is stored.** Placement relations (`right-of`, `same-row`) and arrangements (`ring`, `grid`) are
    kept on the element or scene, so layout can be re-run. A hand-placed element is pinned.
16. **Element ids are author-chosen or derived from content,** never positional.
17. **One camera shape per dimension.** 2D: centre and zoom. 3D: target, yaw, pitch, distance, FOV, and orthographic or
    perspective. A 2D scene drawn in 3D uses a 3D camera held by the view or the animator shot, not stored on the scene;
    its 2D camera is the top-down orthographic case. Turning a 2D scene into an editable 3D scene (use case 4) is a
    separate conversion.
18. **Renderers are pluggable per scene type.** 2D scenes have two: the react-ui-canvas DOM/SVG renderer, and a 3D
    projection that draws 2D elements as flat (or slightly extruded) shapes on the z = 0 plane in Babylon. 3D scenes use
    Babylon, starting from spacetime's on-demand `StageRenderer` and presentation materials. Each element kind
    therefore needs a 3D view for 2D kinds too.
19. **Style tokens are shared, resolution is not.** `hue`, `tone`, `surface`, `border`, `rounded` and `opacity` are
    common. A theme resolves them to CSS in 2D and to materials and lights in 3D.
20. **Every scene and every Component is its own ECHO object** (follows from decision 6). A child-scene element holds a
    Ref to it. Migration therefore splits a canvas's views into separate Scene objects. Undo is per scene. An animator
    shot binds to one Scene.
21. **Resolved positions are stored as well as layout intent.** Every element always has its geometry, so renderers and
    the animator never run layout. Layout writes positions; a hand move pins the element. The round trip that must hold
    is records → text → records. Text written with intent only (no positions) is accepted and laid out on parse.
22. **The `.dx` scene layer gains `scene`, `element` and `camera` statements alongside today's `object`, `move` and
    `remove`.** plugin-illustrator's diagrams keep rendering unchanged in stage 2. Converging the two statement sets is
    later work.
23. **A child scene keeps its own units and is scaled to fit its frame element,** as canvas portals do today. A link
    binds only to elements in its own scene; to connect to something inside a child scene, it binds to the frame.
24. **An element id is fixed when the element is created.** Editing a label never changes it. A derived id that
    collides gets a numeric suffix at creation.

## Ontology

Revised 2026-10-29 (spec D-27..D-33): a drawing has three aspects, each its own ECHO object with its records inside it.

```
Model<O> (Model2D | Model3D)            reusable objects, no positions
  objects: Record<id, Object>
Object                                   id, kind, size (2D) | scale (3D), style?, props?
  parts?: Layout                         a composite: a nested layout shown fitted to each placing element's frame

Layout<E> (Layout2D | Layout3D)          positioned elements in one coordinate space
  model?: Model
  elements: Record<id, Element>
Element (BaseElement + geometry)         id, object? | kind?, order, layer?, hidden?, locked?, label?, style?,
                                         from?/to? (Bindings), members?, arrange? (Arrangement), pinned?, props?
  2D: center: Vec2, size: Size2, rotation: number
  3D: center: Vec3, scale: Vec3, rotation: Vec3 (Euler degrees)

Scene<C> (Scene2D | Scene3D)             a layout seen through a camera
  layout: Layout
  camera: Camera2D | Camera3D
  theme?, name?

Element kinds
  shared:   link, label, group (members: id[])
  2D:       rect, ellipse, polygon, path, note, image, ...   (from react-ui-canvas)
  3D:       cube, sphere, cylinder, cone, pyramid, mesh (imported),
            solid (operation tree: union | difference | extrude over operand element ids; operands hidden)
```

An element places a model object, or names its own kind inline. Resolving it applies the object's kind, size, style and
props; the element's own fields win, and style and props merge. A 3D animation has one model and several scenes that
place its objects differently; a 2D drawing's zoom levels are several scenes over one layout. An animator shot stages a
scene and never writes its samples back to the layout (D-28).

What were child scenes are composite objects (D-29): "B contains a sub-scene" is an object whose `parts` is B's
layout, and "a cluster encapsulated in a sphere" is a sphere object whose parts are the cluster's layout. A hierarchy is
composites whose parts place further composites. A `group` is different (decision 10): its members stay in their
layout's space, and links bind to them directly.

A `solid` recomputes its mesh from its operation tree with Manifold when loaded (decision 9). Only the renderer and
the editor need Manifold; the model package does not.

## Animation contract

Each scene type registers one animator `StageDef`. Targets are element ids. Keyable properties are the element fields
that carry `AnimatableAnnotation`. Script properties map to `center`/`size` (2D) and `center`/`scale` (3D). An element
must not use the id `camera`. The stage binding emits plain data, as today.

## DSL

The DSL extends `.dx`. Records print to it and parse back from it without loss. A document lists its scenes, then its
layouts, then its models; the first scene is the root. In a layout, the word after an element's id names an object of
the layout's model, or else a kind.

```
scene links dim=2d layout=links name="Links" theme=flat {
  camera center=256,0 zoom=1
}

layout links dim=2d model=shapes {
  element a box "A" @ 0,0 hue=blue
  element b box "B" @ 256,0 hue=green
  element c box "C" @ 512,0 hue=amber
  element ab link from=a to=b end=arrow
  element bc link from=b to=c end=arrow
}

model shapes dim=2d {
  object box rect size=128x128 surface=solid border=true rounded=true
}
```

A group arranges members that have no position when the text is read (`arrange=ring arrange-radius=3`), and the
arranged positions are printed back. The semantic layer (`node`, `edge`, `group`, relationship words) stays as a
shorthand that compiles to elements, now keeping its intent on the elements (decision 15).

## Stage 2: exemplars

Each exemplar is a DSL file, a stored scene, and a story that renders it with at least two themes and two cameras, plus
one simple animation (a move or colour change and a camera move).

2D:

1. A square with properties: surface, border, text, rounded.
2. Links A → B → C.
3. B contains a sub-scene.

3D:

4. A cube with properties: surface material, border (edges), rounded.
5. A cluster of spheres connected by links (a group).
6. That group encapsulated in another sphere.
7. A hierarchy of those spheres.
8. A solid: a cube with a cylinder subtracted, then one face extruded (the agent's addition, covering use case 2).

The 2D exemplars are also rendered through the 3D projection (decision 11), with a tilted perspective camera.

Each exemplar is checked by:

- a parse → records → print round trip that returns the same text;
- a render in storybook in each theme and camera;
- the animation playing through plugin-animator.

## Migration

Existing `Drawing.Canvas` content (revision `dxos.org/scene/2`) is migrated to Layout, Scene and Model: views become
layouts, each with a scene for its camera, nodes and links become elements, links' endpoints become bindings,
composites become model objects with parts, `z` becomes `order`.
The migration runs when plugin-canvas switches to the new model (stage 3 or later), not in stage 2.

## Left to the builder

- Package layout. Suggested: the model and schemas in a new `@dxos/scene` package; the DSL grammar stays in
  `@dxos/diagram`, which depends on it.
- How stage 2 renders: adapting the existing react-ui-canvas and spacetime renderers is expected; no new editor.
- The exact DSL syntax, within the shape above.
- Whether the 2D and 3D scene types are two ECHO typenames or one typename with a dimension field, provided decision 1
  holds for the TypeScript types.
