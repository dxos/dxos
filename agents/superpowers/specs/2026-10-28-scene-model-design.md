# Scene model: one ontology and DSL for 2D and 3D

Status: approved by the user, 2026-10-28. Calls 12–24 are the agent's, accepted with the design. Stage 2 is built (plan: `agents/superpowers/plans/2026-10-28-scene-model-stage-2.md`, ledger: `packages/common/scene/TASKS.md`); its animator stages live in plugin-canvas, where the user chose to grow the stage 3 editor.

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

```
Scene (one ECHO object; abstract base)
  dimension-specific scene type: Scene2D | Scene3D
  elements: Record<id, Element>
  layers:   Record<id, Layer>
  camera:   Camera2D | Camera3D        (the resting camera)
  theme?:   ThemeRef
  layout?:  scene-level arrangement intent

Element (record; shared base)
  id, kind, order, layer?, locked?
  label?, style? (hue, tone, surface, border, rounded, opacity), class?
  layout? (placement relations, pin)
  + geometry from the scene type:
      2D: center: Point, size: Size, rotation: number
      3D: position: Vec3, scale: Vec3, rotation: Vec3 (Euler degrees)
  + kind-specific fields

Binding (on a link element)
  from / to: { element: id, anchor? }   or a free point

Element kinds (initial)
  shared:   link, label, scene (child scene), instance (of a Component), group (members: id[])
  2D:       rect, ellipse, polygon, path, note, image, ...   (from react-ui-canvas)
  3D:       cube, sphere, cylinder, cone, pyramid, mesh (imported),
            solid (operation tree: union | difference | extrude over operand element ids; operands hidden)

Component
  a Scene marked reusable; placed by `instance` elements with overrides
```

A child scene is an element of kind `scene` that references another Scene object by ECHO Ref. Its shape (a rect in 2D,
a sphere shell in 3D) frames the child. A hierarchy is nested child scenes. This covers "B contains a sub-scene" and "a
cluster of spheres encapsulated in another sphere".

A `group` is different (decision 10): its members stay in the parent scene's space, and links bind to them directly.
Exemplar 6 is a group inside a sphere that is a child scene.

A `solid` recomputes its mesh from its operation tree with Manifold when loaded (decision 9). Only the renderer and
the editor need Manifold; the model package does not.

## Animation contract

Each scene type registers one animator `StageDef`. Targets are element ids. Keyable properties are the element fields
that carry `AnimatableAnnotation`. Script properties map to `center`/`size` (2D) and `position`/`scale` (3D). An element
must not use the id `camera`. The stage binding emits plain data, as today.

## DSL

The DSL extends `.dx`. Records print to it and parse back from it without loss. The draft syntax below is illustrative;
stage 2 settles it.

```
scene root dim=2d theme=flat
element a rect "A" @0,0 size=120,60 rounded surface=solid hue=blue border
element b scene "B" @240,0 size=160,100 scene=b-detail
element c ellipse "C" @480,0 size=120,60
element ab link from=a to=b end=arrow
element bc link from=b to=c end=arrow
camera center=240,0 zoom=1
```

```
scene cluster dim=3d theme=presentation
element hub sphere "Hub" @0,0,0 scale=1
element s1 sphere ~ring(radius=3)
element s2 sphere ~ring(radius=3)
element s3 sphere ~ring(radius=3)
element l1 link from=hub to=s1
element l2 link from=hub to=s2
element l3 link from=hub to=s3
camera target=0,0,0 yaw=-45 pitch=30 distance=14 fov=0.8 projection=perspective
```

The semantic layer (`node`, `edge`, `group`, relationship words) stays as a shorthand that compiles to elements, now
keeping its intent on the elements (decision 15).

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

Existing `Drawing.Canvas` content (revision `dxos.org/scene/2`) is migrated to Scene and Element: views become scenes,
nodes and links become elements, links' endpoints become bindings, composites become components, `z` becomes `order`.
The migration runs when plugin-canvas switches to the new model (stage 3 or later), not in stage 2.

## Left to the builder

- Package layout. Suggested: the model and schemas in a new `@dxos/scene` package; the DSL grammar stays in
  `@dxos/diagram`, which depends on it.
- How stage 2 renders: adapting the existing react-ui-canvas and spacetime renderers is expected; no new editor.
- The exact DSL syntax, within the shape above.
- Whether the 2D and 3D scene types are two ECHO typenames or one typename with a dimension field, provided decision 1
  holds for the TypeScript types.
