# Scene editor common core — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One data model (`@dxos/scene`) and one editor (`SceneEditor` in react-ui-canvas) for 2D and 3D scenes, each
dimension supplying only a `DimensionConfig`; react-ui-canvas's own `View`/`Node`/`Link` model, `Intent` and
`ViewStore` are retired, and every consumer moves to the shared model.

**Architecture:** `@dxos/scene` owns data (`Model<O, S>`, `Layout<E, S>`, `Scene<C>`), edits (`LayoutIntent`,
`ModelIntent`), styles (`Style2D`/`Style3D`, `StyleCatalog`, `resolveStyle`). react-ui-canvas owns the editor core
(store, command table, history, clipboard, panels) and the 2D viewport; react-ui-scene owns the 3D viewport. A viewport
renders, picks and turns gestures into intents; it never writes ECHO and never owns a command.

**Tech Stack:** Effect Schema, ECHO (`@dxos/echo`), React, effect atoms (`@effect/atom-react`), Babylon.js (3D),
Manifold (solids), vitest, storybook (localhost:9009).

**Spec:** `packages/ui/react-ui-canvas/docs/COMMON-CORE.md` (decisions 1–11; step 0 = one DSL target). Spec decisions are recorded in
`packages/common/scene/SPEC.mdl` (latest D-89+).

## Global Constraints

- One PR (decision 9): dxos/dxos#14282. Basics first, then tests and storybooks for review (Phase F).
- 2D/3D parity on every task: shared behaviour and implementation; only the viewport and dimension geometry differ.
  Each task's **Parity** line states shared vs per-dimension.
- Every react-ui-canvas record field becomes a typed field of `Element2D` or `Layout2D` (decision 7) — no untyped
  `props` entries for known fields.
- Gestures (drag, resize, rotate, orbit, drag-to-create) stay in memory and commit one intent on release (decision 8).
- Styles: `Style2D` (CSS-like) and `Style3D` (material-like) are separate; one mechanism resolves them (decision 6).
- Cameras are per-viewer view state (D-47); a scene's `camera` is the authored view only.
- No compatibility shims or re-exports when code moves; update every import.
- No casts to silence types (`as any`, `as unknown as`, `!`).
- Workspace deps `workspace:*`; never bump the catalog (`pnpm-workspace.yaml` must not change).
- Tests: `pnpm --filter <pkg> exec vitest run --project=node <file>`; typecheck `npx tsc --noEmit -p tsconfig.json` in
  the package (rebuild a dependency with `moon run <pkg>:build` when a consumer reads stale dist); lint `npx oxlint`;
  format `npx oxfmt` before every commit; commit by pathspec.
- Storybook on :9009 is shared and serves this worktree; never start a second one; restart it (by PID from
  `lsof -ti :9009 -sTCP:LISTEN`, `moon run storybook-react:serve-nodeps`) after deleting or renaming story files.
- Never touch `tools/autocue/showcase/echo3d/*`.

## Where the expectations don't hold

What I checked: every schema in react-ui-canvas `src/model/types.ts`, the projection models in
`src/engine/projections/{constrained,dynamic,lattice}.ts`, plugin-canvas `model/image-node.ts`, `@dxos/animation`
`Timeline`, and every type and command in `@dxos/diagram` `src/scene.ts`, against `@dxos/scene` `Scene.ts`. Six
places don't fit the expectations as stated.

1. **Plugin-defined node kinds can't all be typed on `Element2D` (expectation 1, decision 7).** Built-in node types
   are closed schemas, but plugins register their own: plugin-uml `ClassNode` (`plugins/plugin-uml/src/types/
ClassNode.ts`), the compute shapes (`ui/react-ui-canvas-compute/src/shapes/*.tsx`), plugin-canvas `ImageNode`
   (`plugins/plugin-canvas/src/model/image-node.ts:17`), and `GeneratorNode.params` is an open record
   (`ui/react-ui-canvas/src/model/types.ts:397`). A static `Element2D` can't list fields it doesn't know.
   Options: (a) built-in kinds typed on `Element2D`; plugin kinds carry a `kindProps` field whose schema the
   `ElementKindRegistry` declares and validates (typed through the registry's generic); (b) plugins extend the
   `Element2D` union by declaration merging; (c) move every plugin kind into `@dxos/scene`. Recommended: (a).
2. **The constrained and dynamic models duplicate element data (expectation 1).** `ConstrainedModel = { nodes:
ConstrainedNode[]; constraints }` with `ConstrainedNode = { id; label?; type?; style? }`
   (`engine/projections/constrained.ts:36-44`) and `GraphModel = { nodes; edges }` + `Overlay.positions`
   (`engine/projections/dynamic.ts:69-77`) restate labels, types, styles and edges that the layout's elements already
   hold. Moving them as they are gives two sources of truth. Options: (a) normalise — `Layout2D.constraints:
Constraint[]` referencing element ids; graph edges are the layout's link elements; overlay positions are element
   centers; the projection derives its nodes from the elements (not mechanical; the engine changes); (b) store the
   models verbatim on `Layout2D` (mechanical, duplicated). Recommended: (a).
3. **Two timeline homes.** react-ui-canvas keeps a `Timeline` on the canvas (`model/timeline.ts`, `sampleView`,
   `sampleCamera`; `@dxos/animation` `Timeline` at `common/animation/src/types.ts:62`), while plugin-animator's
   `Animation`/`Shot` stages a `Scene` (D-28). Options: (a) `Layout2D.timeline` typed field (mechanical; two
   animation systems remain); (b) the canvas timeline becomes an animator `Shot` over the scene (one system; not
   mechanical). Recommended: (a) now, (b) as a follow-up.
4. **Diagram objects have local frames; `Layout2D` is flat (expectation 2).** A `WorldObject` has `origin`, `scale`
   ("canvas px per local unit"), `index` and `ref`, and its elements are in object-local units
   (`common/diagram/src/scene.ts:289-307`); `MoveObject` moves the whole object (`:339`). `Layout2D` elements have no
   parent transform (only composite parts, fitted at 80%). Options: (a) flatten at compile time — bake `origin`/`scale`
   into each element, add a `group` element per object (members = its elements, `dsl.object` = object id), and map
   `MoveObject` to a `move` of the group's members (output-stage only; the engines are unchanged); (b) objects become
   composite model objects placed by `instance` elements with a scale (keeps local frames; changes how the SVG and the
   canvas draw them). Recommended: (a). Caveat: `scale ≠ 1` also scales stroke and text in the SVG renderer — baking
   it in needs the renderer to read stroke/text size from the element, which 0.3's metric gate checks.
5. **The diagram and canvas style vocabularies differ (expectation 2).** Diagram: `Color` (13 names incl.
   `light-violet`, `white`, `black`), `Fill` (`none|solid|pattern|tint`), `Stroke` (`sketchy|solid|dashed|dotted`),
   `Weight` (`s|m|l|xl`) (`scene.ts:14-39`). Canvas: `StyleHue` (9 hues), `tone` 0–3, `fill`/`border` booleans,
   `lineStyle` (`solid|dashed|dotted`), `fontSize` (`types.ts:91-168`). There's no lossless 1:1 map (no `sketchy`,
   no `pattern`, no `white`/`black` hue, weight vs font size). Options: (a) `Style2D` carries both vocabularies as
   typed fields (diagram fields used by the SVG renderer and canvas `diagram` nodes, canvas fields by canvas nodes) —
   mechanical, two vocabularies; (b) one `Style2D` vocabulary with a documented lossy map (diagram output changes
   visually; breaks the corpus metric gate for weights). Recommended: (a), unify later.
6. **Diagram arcs and free curves have no canvas renderer.** `Arc` and free `Curve`/`Polyline` elements
   (`scene.ts:97-136`) render only in the SVG renderer; react-ui-canvas's `DiagramShape` union covers `Box`, `Circle`,
   `Text`, `Portal` only (`types.ts:375`), and its curve/spline types are links. As `Element2D` kinds the data maps
   mechanically, but the 2D viewport needs new draw code for `arc`, `curve` and open `polyline` elements (Task C.1).

Behaviours: nothing found that can't be shared. Projection-owned positions (lattice/constrained/dynamic rewrite or
refuse a move) exist only in 2D today; the contract keeps them as an optional `config.constrain` hook so 3D can adopt
one later.

## Canvas data mapping

Every react-ui-canvas record type and field → its typed home. **M** = mechanical (rename/move, same values); **N** =
not mechanical (see "Where the expectations don't hold"). Round-trip tests: Task A.3, one test per row group.
The data-mapping tasks (0.1, A.1–A.3) change no engine behaviour; engine changes are confined to Phases C and D.

| Record                                       | Field                                                                                                                                     | New home                                                                                                      |                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| **View** (`types.ts:678`)                    | `id`                                                                                                                                      | `Layout2D.key`                                                                                                | M                 |
|                                              | `name`                                                                                                                                    | `Layout2D.name`                                                                                               | M                 |
|                                              | `nodes`, `links`                                                                                                                          | `Layout2D.elements` (nodes and links are elements; links by `kind`)                                           | M                 |
|                                              | `layers`                                                                                                                                  | `Layout2D.layers: Record<string, Layer>`                                                                      | M                 |
|                                              | `kind: view\|composite`                                                                                                                   | `view` → a `Layout2D` a scene shows; `composite` → `Model2D.objects[id]` with `parts` = that layout           | M                 |
|                                              | `anonymous`                                                                                                                               | `Object2D.anonymous`                                                                                          | M                 |
| **Node base** (`types.ts:171`)               | `id`                                                                                                                                      | `BaseElement.id`                                                                                              | M                 |
|                                              | `type`                                                                                                                                    | `BaseElement.kind`                                                                                            | M                 |
|                                              | `z`                                                                                                                                       | `BaseElement.order`                                                                                           | M                 |
|                                              | `locked`                                                                                                                                  | `BaseElement.locked`                                                                                          | M                 |
|                                              | `center`, `size`, `rotation`                                                                                                              | `Element2D.center`, `.size`, `.rotation`                                                                      | M                 |
|                                              | `ports: Port[]`                                                                                                                           | `Element2D.ports: Port[]` (`Port` `{id, side, offset, accepts}` moves to `@dxos/scene`)                       | M                 |
|                                              | `portsPerSide`                                                                                                                            | `Element2D.portsPerSide`                                                                                      | M                 |
|                                              | `layer`                                                                                                                                   | `BaseElement.layer`                                                                                           | M                 |
|                                              | `class`                                                                                                                                   | `BaseElement.style` (named style id)                                                                          | M                 |
|                                              | `style: NodeStyle`                                                                                                                        | `Element2D.overrides: Partial<Style2D>`                                                                       | M                 |
|                                              | `exposed`                                                                                                                                 | `Element2D.exposed`                                                                                           | M                 |
|                                              | `label` (`boxFields`)                                                                                                                     | `BaseElement.label`                                                                                           | M                 |
| **NodeStyle** (`types.ts:140`)               | `hue`, `tone`, `opacity`, `lineStyle`, `rounded`, `fill`, `border`, `guide`, `fontFamily`, `fontSize`, `alignHorizontal`, `alignVertical` | `Style2D` same names                                                                                          | M                 |
| **rect / ellipse**                           | (base fields only)                                                                                                                        | `kind: 'rect' \| 'ellipse'`                                                                                   | M                 |
| **cloud**                                    | `params.bumps` (+`CloudParams`)                                                                                                           | `Element2D.cloud: CloudParams`                                                                                | M                 |
| **polygon**                                  | `params.sides`, `params.fit`                                                                                                              | `Element2D.polygon: PolygonParams`                                                                            | M                 |
| **polyline**                                 | `points`, `params.closed`                                                                                                                 | `Element2D.points: Vec2[]`, `Element2D.closed`                                                                | M                 |
| **note**                                     | `text`, `contents`                                                                                                                        | `BaseElement.text`, `Element2D.contents`                                                                      | M                 |
| **view** (portal)                            | `scene`, `link.contents`                                                                                                                  | `BaseElement.object` → composite whose `parts` = that layout; `Element2D.view: { link?: Ref; contents? }`     | M                 |
| **instance**                                 | `composite`, `overrides`, `fit`                                                                                                           | `BaseElement.object`; `Element2D.overrides` (per-part: `Record<string, Partial<Element2D>>`), `Element2D.fit` | M                 |
| **path**                                     | `d`, `viewBox`, `fill`                                                                                                                    | `Element2D.path: { d; viewBox }`, `Style2D.fillColor`                                                         | M                 |
| **diagram** (`types.ts:383`)                 | `element` (`Box\|Circle\|Text\|Portal`), `heading`                                                                                        | flattened: the diagram element's kind and fields (see Diagram DSL mapping); `Element2D.heading`               | M (after Phase 0) |
| **generator** (`types.ts:397`)               | `generator`, `params`, `seed`                                                                                                             | `Element2D.generator: { id; seed?; params }` — `params` typed by the generator's registered schema            | N (1)             |
| **image** (plugin-canvas `image-node.ts:17`) | `src`, `alt`, `fit`                                                                                                                       | plugin kind: `kindProps` by registry schema                                                                   | N (1)             |
| **plugin kinds** (UML class, compute shapes) | their fields                                                                                                                              | `kindProps` by registry schema                                                                                | N (1)             |
| **Link base** (`types.ts:560`)               | `id`, `z`, `locked`, `layer`, `text`                                                                                                      | `BaseElement.id`, `.order`, `.locked`, `.layer`, `.label`                                                     | M                 |
|                                              | `type: line\|curve\|spline\|smart`                                                                                                        | `kind: 'link'`, `Element2D.route: 'line'\|'curve'\|'spline'\|'smart'`                                         | M                 |
|                                              | `source`/`target` `{node, port}`                                                                                                          | `BaseElement.from`/`to` `{ element, anchor: port }`                                                           | M                 |
|                                              | `source`/`target` `{point}`                                                                                                               | `Element2D.fromPoint`/`toPoint: Vec2`                                                                         | M                 |
|                                              | `ends {start, end}`                                                                                                                       | `Element2D.ends: LinkEnds`                                                                                    | M                 |
|                                              | `class`, `style: LineStyle`                                                                                                               | `BaseElement.style`, `Element2D.overrides` (`Style2D` line fields)                                            | M                 |
|                                              | `connector` (`DiagramConnector`)                                                                                                          | `Element2D.connector` (relation, head, tail, route, caption; colour/stroke → `Style2D`)                       | M                 |
|                                              | spline `points`                                                                                                                           | `Element2D.points`                                                                                            | M                 |
| **Layer** (`types.ts:625`)                   | `id`, `name`, `z`, `hidden`                                                                                                               | `Layout2D.layers[id] = { name; order; hidden }`                                                               | M                 |
| **StyleClass** (`types.ts:525`)              | `id`, `name`, `style`                                                                                                                     | `Model2D.styles[id]: Style2D` (+`name`)                                                                       | M                 |
| **Lattice** (`utils/lattice.ts:15`)          | `LatticeSpec {width, height, gutterX, gutterY}`                                                                                           | `Layout2D.lattice`                                                                                            | M                 |
| **Constrained** (`constrained.ts:41`)        | `nodes`, `constraints`                                                                                                                    | `Layout2D.constraints: Constraint[]`; nodes derived from elements                                             | N (2)             |
| **Dynamic** (`dynamic.ts:69`)                | `nodes`, `edges`, `Overlay.positions`                                                                                                     | edges = link elements; positions = element centers                                                            | N (2)             |
| **Scored**                                   | (no stored model)                                                                                                                         | —                                                                                                             | M                 |
| **Timeline** (`animation/types.ts:62`)       | `duration`, `loop`, `fps`, `tracks`                                                                                                       | `Layout2D.timeline: Timeline`                                                                                 | N (3)             |
| **Canvas settings**                          | `projection`, `lattice`, `grid`, `theme`, `styleSet`, `background`, `readonly`, …                                                         | `Canvas.settings` (unchanged); `theme`/`styleSet` → default `StyleCatalog` choice                             | M                 |

## Diagram DSL mapping

Only the output target changes. Grammar changes: **none** — the `.dx` semantic statements and the scene statements are
unchanged; `Dsl.compile`'s result type changes (`ParseResult.commands` → `{ document, layout, intents }`).

| `@dxos/diagram` (`scene.ts`)                                                               | → `@dxos/scene`                                                                                                                                                     |                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `WorldObject {id, origin, scale, index, ref, elements}` (`:289`)                           | a `group` element (`members` = its elements, `dsl.object` = id, `order` = index); `origin`/`scale` baked into each member's geometry; `ref` → `Element2D.view.link` | N (4)               |
| `Box {kind rect\|ellipse\|diamond\|triangle, x, y, w, h, rotation, text, corners}` (`:68`) | `kind: 'box'`, `Element2D.shape` = box kind, `center` = (x+w/2, y+h/2), `size` = (w, h), `rotation`, `label` = text, `Element2D.corners`                            | M                   |
| `Circle {cx, cy, r, text}` (`:85`)                                                         | `kind: 'circle'`, `center` = (cx, cy), `size` = (2r, 2r), `label`                                                                                                   | M                   |
| `Polyline {points, closed, guide}` (`:97`)                                                 | `kind: 'polyline'`, `points`, `closed`, `Style2D.guide`                                                                                                             | M (renderer: N (6)) |
| `Curve {points}` (`:111`)                                                                  | `kind: 'curve'`, `points`                                                                                                                                           | M (renderer: N (6)) |
| `Arc {cx, cy, r, startAngle, endAngle}` (`:124`)                                           | `kind: 'arc'`, `center`, `size`, `Element2D.arc: {start, end}`                                                                                                      | M (renderer: N (6)) |
| `Text {x, y, w, text}` (`:137`)                                                            | `kind: 'text'`, `center`/`size` from (x, y, w), `BaseElement.text`                                                                                                  | M                   |
| `Arrow {from, to (#port), start, end, text, head, tail, relation}` (`:208`)                | `kind: 'link'`, `from`/`to` `{element, anchor: port}` (ids `object/element`), `fromPoint`/`toPoint`, `label`, `Element2D.connector {head, tail, relation}`          | M                   |
| `Portal {x, y, w, h, ref, text}` (`:267`)                                                  | `kind: 'portal'`, geometry as Box, `Element2D.view.link` = `ref` (DXN), `label`                                                                                     | M                   |
| element `id`                                                                               | `BaseElement.dsl.element`; element id = `object/element`                                                                                                            | M                   |
| `color`, `fill`, `stroke`, `weight`                                                        | `Style2D` diagram fields `color`, `fillMode`, `stroke`, `weight`                                                                                                    | N (5)               |
| `UpsertObject` (`:317`)                                                                    | `create` (or `update` when present) for the group + its members, in one `batch`                                                                                     | M                   |
| `UpsertElements` (`:322`)                                                                  | `create`/`update` per element                                                                                                                                       | M                   |
| `RemoveElements` (`:328`)                                                                  | `delete` of those ids                                                                                                                                               | M                   |
| `RemoveObject` (`:334`)                                                                    | `delete` of the group and its members                                                                                                                               | M                   |
| `MoveObject {origin}` (`:339`)                                                             | `move` of the group's members by the origin delta                                                                                                                   | M (via (4))         |

## Shared editor contract

| Item                                                 | Shared / per-dimension                              | Why (per-dimension items only)                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Components**                                       |                                                     |                                                                                                                             |
| `SceneEditor.Root` (store, roles, lock, keyboard)    | shared                                              |                                                                                                                             |
| Viewport host (`SceneEditor.Viewport`)               | shared host; `config.viewport` per-dimension        | Drawing differs: SVG/DOM vs Babylon.                                                                                        |
| Tool rail                                            | shared                                              |                                                                                                                             |
| Actions bar                                          | shared                                              |                                                                                                                             |
| Camera bar                                           | shared; `config.camera` per-dimension               | Pan/zoom vs orbit/zoom maths.                                                                                               |
| Display panel                                        | shared; `config.display` per-dimension              | Grid kinds and guides differ (lattice guides are 2D-only).                                                                  |
| Inspector panel (dock/float)                         | shared                                              |                                                                                                                             |
| Properties section                                   | shared; `config.propertyForm` per-dimension         | Geometry fields differ (size vs scale; ° vs Vec3).                                                                          |
| Views, Objects, Layers, Styles sections              | shared                                              |                                                                                                                             |
| Context menu                                         | shared                                              |                                                                                                                             |
| **Behaviours**                                       |                                                     |                                                                                                                             |
| Selection (click, shift-click, marquee, drill-in)    | shared                                              |                                                                                                                             |
| Cut / copy / paste / duplicate (`.dx`, lift/flatten) | shared                                              |                                                                                                                             |
| Undo / redo (canvas-session, field-level inverses)   | shared                                              |                                                                                                                             |
| Lock (read-only)                                     | shared                                              |                                                                                                                             |
| Roles (card/section/slide)                           | shared                                              |                                                                                                                             |
| Keymap, Cmd-drag hand                                | shared                                              |                                                                                                                             |
| Create tools select on elements; drag-to-size        | shared rule; gesture per-dimension                  | 2D sweeps a box; 3D sweeps a base then a height.                                                                            |
| Snap                                                 | shared toggle; `config.geometry.snap` per-dimension | Grid px vs world units/15°/0.1.                                                                                             |
| Styles (`resolveStyle`, catalogs)                    | shared mechanism; `config.styles` per-dimension     | `Style2D` vs `Style3D` contents.                                                                                            |
| **Pluggable (`DimensionConfig`)**                    |                                                     |                                                                                                                             |
| `viewport`                                           | per-dimension                                       | Rendering and picking engines differ.                                                                                       |
| `tools`                                              | per-dimension list, shared categories               | Each dimension has its own shapes (rect/ellipse vs cube/sphere) and dimension-only tools (polyline, text vs extrude, face). |
| `geometry` (move/scale/rotate/snap/visible)          | per-dimension                                       | `Vec2` vs `Vec3` maths.                                                                                                     |
| `camera`                                             | per-dimension                                       | Camera models differ (`Camera2D` vs `Camera3D`).                                                                            |
| `display`                                            | per-dimension                                       | Grid kinds, guides.                                                                                                         |
| `sections` (extra)                                   | per-dimension                                       | e.g. 3D face info; 2D none beyond shared.                                                                                   |
| `propertyForm`                                       | per-dimension                                       | Geometry fields differ.                                                                                                     |
| `styles`                                             | per-dimension                                       | `Style2D` vs `Style3D`.                                                                                                     |
| `constrain` (optional)                               | per-dimension                                       | Only 2D's lattice/constrained/dynamic modes rewrite moves today.                                                            |
| `commands` (extras)                                  | per-dimension                                       | 3D: join, subtract, import mesh, export STL; 2D: align/distribute.                                                          |

## Review Focus

0. **Diagram output unchanged:** after Phase 0 the illustrator corpus has identical metrics (crossings, bends,
   overlaps; `corpus.test.ts` snapshot unchanged; `moon run plugin-illustrator:render-diagrams` compared by metrics). Pinned by Task 0.3.

1. **Round-trip parity:** every built-in 2D node and link type (rect, ellipse, cloud, polygon, polyline, note, view,
   instance, path, generator, diagram; line, curve, spline, smart) survives react-ui-canvas record → `Element2D` → render
   → edit → store with no field lost. Pinned by Task 1.3's corpus test.
2. **Drag smoothness:** a 2D drag of 200 elements and a 3D gizmo drag write ECHO once, on release. Pinned by Task 3.2.
3. **Undo with a peer:** an undo after a peer edits another field of the same element keeps the peer's field. Pinned
   by Task 2.3.
4. **Projections own positions:** in lattice/constrained/dynamic modes a move intent may be rewritten or refused; the
   viewport previews via `constrain` before release. Pinned by Tasks 4.1–4.3.
5. **Consumer breakage:** nothing imports the retired `View`/`Intent`/`ViewStore` (Task 5.6 grep gate), and compute,
   UML and code graphs render and edit. Pinned by Tasks 5.3–5.5.

---

## Phase 0 — One DSL target (decision 11)

The `.dx` semantic statements (`diagram`/`node`/`edge`/`group`) and the layout engines currently produce
`@dxos/diagram` `Scene.Command`s (`UpsertObject`/`UpsertElements`/`RemoveElements`/`RemoveObject`/`MoveObject` over
`WorldObject`s of `Box`/`Circle`/`Polyline`/`Curve`/`Arc`/`Text`/`Arrow`/`Portal`, `common/diagram/src/scene.ts`);
`Dsl.compile` returns `ParseResult { commands, problems, ranges }` (`dsl/parse.ts`). Phase 0 makes every engine emit
`@dxos/scene` `Layout2D` elements + model objects through one `LayoutIntent` batch, and moves every reader onto
`Layout2D`.

### Task 0.1: Diagram shapes as `Element2D` kinds; DSL identity as a typed field

**Files:**

- Modify: `packages/common/scene/src/Scene.ts`, `src/element2d.ts` (created here; extended in A.1)
- Test: `packages/common/scene/src/element2d.test.ts`

**Interfaces:**

- Produces: element kinds `box` (`BoxKind` rect/ellipse/diamond/triangle, `corners`), `circle`, `polyline`, `curve`,
  `arc`, `text`, `arrow` (relation, head/tail, route, caption), `portal`; their fields typed on `Element2D`
  (`stroke`/`fill`/`weight`/`color` become `Style2D` fields — Task A.2 adds the style split, this task adds the
  fields); `BaseElement.dsl?: { object: string; element?: string }` (replaces `props.dsl`, D-38).
  `DIAGRAM_FIELD_MAP` (scene.ts element field → `Element2D` path).
- **Parity:** the kinds are 2D; `dsl` identity is on `BaseElement` (3D `.dx` scene statements use it too).

- [ ] **Step 1: Failing test** `test('every @dxos/diagram element field has a typed Element2D field', …)` iterating
      the `Scene.Element` union members' property names through `DIAGRAM_FIELD_MAP` onto `Element2D`'s AST;
      `test('dsl identity is a typed BaseElement field', …)`.
- [ ] **Step 2:** `pnpm --filter @dxos/scene exec vitest run --project=node src/element2d.test.ts` → FAIL.
- [ ] **Step 3:** Implement. **Step 4:** PASS + scene suite.
- [ ] **Step 5:** Commit `scene: diagram shapes as Element2D kinds, typed DSL identity`.

### Task 0.2: Engines emit one `LayoutIntent` batch

**Files:**

- Modify: `packages/common/diagram/src/dsl/compile.ts`, `dsl/parse.ts` (`ParseResult`), `semantic-engine.ts`
  (`compile`), `sequence-engine.ts` (`solve` consumers), `uml-engine.ts` (`compile`), `mermaid-engine.ts`
  (`layout`, `compile`), `dsl/convert.ts`
- Test: `packages/common/diagram/src/dsl/compile.test.ts` (new), existing engine tests

**Interfaces:**

- Produces: `ParseResult = { document: SceneDocument; layout: string; intents: LayoutIntent[]; problems; ranges }`
  (ranges keyed by `dsl` identity); each engine's `compile` returns `LayoutIntent[]` (one `batch`) plus the model
  objects for portals/composites. A temporary test-only helper `commandsToIntents(commands)` exists only inside the
  equivalence test and is deleted in 0.5.
- **Parity:** 2D target (diagrams are 2D); the intent vocabulary is the shared one.

- [ ] **Step 1: Failing test** `test('the corpus compiles to Layout2D with the same geometry as the old commands',
…)`: for every `docs/diagrams/*.mmd` and every `.dx` in `src/testing/exemplars` + `plugin-illustrator` fixtures,
      compile both ways and assert element count, kinds, positions and routes equal (within 1e-6).
- [ ] **Step 2:** `pnpm --filter @dxos/diagram exec vitest run --project=node src/dsl/compile.test.ts` → FAIL.
- [ ] **Step 3:** Switch the engines' emission; the semantic/sequence/UML/mermaid placement and routing code is
      untouched — only the output stage changes.
- [ ] **Step 4:** PASS + full diagram suite (`pnpm --filter @dxos/diagram exec vitest run --project=node`).
- [ ] **Step 5:** Commit `diagram: engines emit Layout2D through one LayoutIntent batch`.

### Task 0.3: The SVG renderer and `.dx.svg` read `Layout2D`

**Files:**

- Modify: `packages/common/diagram/src/svg-file.ts` (`resolveScene` → `resolveLayout`), `dx-svg.ts` (payload =
  `{ format, document: SceneDocument, source }`; `extract` reads only the new payload),
  `svg-handler.ts`; `packages/plugins/plugin-illustrator/src/components/SceneSvg.tsx`
- Test: `dx-svg.test.ts`, `svg-file.test.ts`, `packages/plugins/plugin-illustrator/src/model/corpus.test.ts`

**Interfaces:**

- Produces: `SceneSvg` props `{ document: SceneDocument; layout: string }`; `renderSvg(doc, layout): Markup`.
- Consumes: 0.2's `ParseResult`.
- **Parity:** 2D renderer (the editor's 2D viewport, Phase C, is the interactive counterpart; both resolve styles
  through `resolveStyle` after A.2).

- [ ] **Step 1: Before-image:** run `moon run plugin-illustrator:render-diagrams` and
      `DX_RUN_MANUAL_TESTS=1 moon run plugin-illustrator:test -- src/model/corpus.test.ts`; save the renders to
      `temp/corpus-before/` (gitignored) and keep the committed snapshot.
- [ ] **Step 2: Failing test** `svg-file.test.ts`: `test('a Layout2D renders the same markup as the scene it
replaces', …)`; `dx-svg.test.ts`: `test('a .dx.svg payload carries the SceneDocument and imports back', …)`.
- [ ] **Step 3:** Implement. **Step 4:** PASS; `corpus.test.ts` passes with the snapshot unchanged; re-render and
      compare against `temp/corpus-before/` by **metrics** (crossings, bends, overlaps, the corpus snapshot) — identical metrics required; byte-identical SVG is not (element ids may change).
- [ ] **Step 5:** Commit `diagram: SVG rendering and .dx.svg on Layout2D`.

### Task 0.4: Illustrator operations and the canvas builder use `Layout2D` directly

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/operations/{draw,edit,read,convert,generate,score}.ts`,
  `src/commands/drawing/{render,export,import}.ts`, `src/model/drawing-file.ts`;
  `packages/plugins/plugin-canvas/src/model/{handler,builder,compiler}.ts`
- Test: `operations/convert.test.ts`, `commands/drawing/drawing.test.ts`, plugin-canvas `model/handler.test.ts`

**Interfaces:**

- Produces: `DrawingBuilder.apply(canvas, intents: LayoutIntent[])` (no `Scene.Command` translation); the `Draw`
  operation writes the compiled batch into the drawing's layout; `Read` prints `.dx` from `Layout2D`.
- **Parity:** the assistant's `.dx` path is the same for 2D and 3D scene statements.

- [ ] **Step 1: Failing tests:** `test('Draw writes the compiled Layout2D into the canvas', …)`,
      `test('render exports the same SVG as before', …)` (against 0.3's before-image), handler test without the
      command translation.
- [ ] **Steps 2–4:** FAIL → implement → PASS (plugin-illustrator, plugin-canvas suites).
- [ ] **Step 5:** Commit `plugin-illustrator, plugin-canvas: draw, render and build on Layout2D`.

### Task 0.5: Retire `@dxos/diagram`'s scene model as a data model

**Files:** Remove `Scene.Command`, `UpsertObject`/`UpsertElements`/`RemoveElements`/`RemoveObject`/`MoveObject`,
`WorldObject`, `Scene` and the command reducer from `common/diagram/src/scene.ts`; move shape geometry helpers still
needed by renderers/scoring next to them; `aesthetics.ts`, `score.ts`, `appeal.ts`, `diagnostics.ts`, `nudge.ts`,
`objective.ts`, `compact.ts`, `relations` read `Layout2D`/`RenderList2D`. Delete the 0.2 equivalence helper.

- [ ] **Gate:** `grep -rnE "Scene\.Command|UpsertElements|UpsertObject|RemoveElements|MoveObject" packages --include=*.ts --include=*.tsx`
      returns nothing; diagram, plugin-illustrator, plugin-canvas suites and `corpus.test.ts` pass with the snapshot
      unchanged; render-diagrams metrics match 0.3's before-image.
- [ ] Commit `diagram: retire the scene command model; diagrams are Layout2D`.

---

## Phase A — One data model (typed 2D, styles)

### Task A.1: Inventory react-ui-canvas record fields into `Element2D`/`Layout2D` (extends 0.1's `element2d.ts`)

**Files:**

- Modify: `packages/common/scene/src/Scene.ts`
- Modify: `packages/common/scene/src/element2d.ts` (from 0.1)
- Test: `packages/common/scene/src/element2d.test.ts`

**Interfaces:**

- Produces: `Element2D` gains typed fields for every node/link field in react-ui-canvas `model/types.ts`:
  `ports?: Record<string, Port>`, `portsPerSide?`, `exposed?: string[]`, `order` (replaces `z`), `locked?`,
  `points?: Vec2[]` (spline/polyline), `params?` per kind (`CloudParams`, `PolygonParams`, `PolylineParams` as typed
  unions keyed by kind), `view?: { scene: string; link?: Ref; overrides?; fit? }` (portal/instance), `path?: { d;
viewBox? }`, `generator?: GeneratorSpec`, `diagram?: DiagramShape`, `heading?: DiagramHeading`, `connector?:
DiagramConnector`, `ends?: LinkEnds`, `from`/`to` with `anchor` = port id or `point?: Vec2` (point endpoints),
  `text?`. `Layout2D` gains `layers?: Record<string, Layer>`, `kind?: 'view' | 'composite'`, `anonymous?`,
  `timeline?: Timeline` (react-ui-canvas `model/timeline.ts`), lattice/constraint/dynamic models (`lattice?:
LatticeSpec`, `constraints?`, `graph?: GraphModel`) as typed fields.
- Port, Layer, LatticeSpec, GraphModel, Timeline schemas move from react-ui-canvas into `@dxos/scene` (no re-export
  left behind; react-ui-canvas imports them from `@dxos/scene`).
- **Parity:** shared — `BaseElement` keeps id/kind/object/label/layer/locked/order/style/links/groups; 2D-only fields
  live on `Element2D`; anything both need (e.g. `locked`, `order`, `layer`, `text`) is on `BaseElement`.

- [ ] **Step 1: Failing test** — `element2d.test.ts`:
      `test('every react-ui-canvas node field has a typed Element2D field', …)` iterates the property names of
      react-ui-canvas `nodeBase`, `boxFields` and each built-in node schema (import from `@dxos/react-ui-canvas` test-only
      via the `testing` export) and asserts each maps through `FIELD_MAP` (exported const, record-field → element path) to
      a property present on `Element2D`'s AST. Same for `linkBase` and link types, and View fields → `Layout2D`.
- [ ] **Step 2:** `pnpm --filter @dxos/scene exec vitest run --project=node src/element2d.test.ts` → FAIL (missing fields).
- [ ] **Step 3:** Add the schemas/fields; export `FIELD_MAP`.
- [ ] **Step 4:** Run → PASS; run the scene suite.
- [ ] **Step 5:** Commit `scene: typed Element2D and Layout2D for every canvas record field`.

### Task A.2: `Style2D`, `Style3D`, `StyleCatalog`, `resolveStyle`

**Files:**

- Create: `packages/common/scene/src/style.ts`, `src/style.test.ts`
- Modify: `src/Scene.ts` (remove the shared `Style`; `BaseElement.style?: string`; `Element2D.overrides?:
Partial<Style2D>`; `Element3D.overrides?: Partial<Style3D>`; `Model<O, S>.styles`, `catalogs?: Ref<StyleCatalog>[]`;
  `Layout<E, S>.styles?: Record<string, Partial<S>>`), `src/index.ts`, `SPEC.mdl` (supersede D-14)

**Interfaces:**

- Produces:
  `Style2D` (fields of react-ui-canvas `styleFields`/`lineStyleFields`: hue, tone, fill, border, rounded, lineStyle,
  fontFamily, fontSize, align, opacity …), `Style3D` (color/hue+tone, metalness, roughness, opacity, glass, emissive,
  rounded), `class StyleCatalog` (ECHO, `org.dxos.type.scene.styleCatalog@0.1.0`: `{ name; dim; styles }`),
  `resolveStyle<S>(element: { style?: string; overrides?: Partial<S> }, layout: { styles?: Record<string,
Partial<S>> }, model: { styles: Record<string, S> }, catalogs: readonly { key: string; styles: Record<string, S>
}[], defaults: Record<string, S>): S`, `styleRef(catalog: string, key: string): string` (`'brand:warning'`).
- **Parity:** shared — the mechanism (`resolveStyle`, catalogs, references); per-dimension — the `S` schema.

- [ ] **Step 1: Failing tests** — `style.test.ts`:
      `test('resolution order: element overrides, layout, model, catalogs in order, defaults', …)` with distinct values
      per level asserting the nearest wins field by field; `test('a catalog reference names its catalog', …)` resolves
      `'brand:warning'` from catalog `brand` not `other`; `test('Style2D and Style3D are distinct schemas', …)` decoding a
      `Style3D`-only field (`metalness`) into `Style2D` fails.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS; scene suite; diagram suite (`.dx` reader/printer updated: `style=` names a style,
      `overrides` print as before).
- [ ] **Step 5:** Commit `scene: Style2D/Style3D, style catalogs and one resolver`.

### Task A.3: Round-trip corpus and the scene/2 migration on the final shape

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/model/migrate-scenes.ts` (+test)
- Create: `packages/common/scene/src/testing/canvas-corpus.ts` (every built-in node/link type, layers, styles,
  timeline, lattice/constraint/dynamic models)
- Test: `packages/plugins/plugin-canvas/src/model/migrate-scenes.test.ts`

**Interfaces:**

- Consumes: A.1 `FIELD_MAP`, A.2 styles. Produces: `legacyDocument(content): SceneDocument` emitting the final shape
  (styles → `Model2D.styles`, `class` → `style`, own style → `overrides`).
- **Parity:** 2D-only (legacy data is 2D).

- [ ] **Step 1: Failing test** `test('every corpus record round-trips through Element2D with no field lost', …)`:
      legacy content → `legacyDocument` → back through the 2D viewport's read model (`toRenderList2D`, Task C.1) equals the
      original records field by field (deep equal after normalising `z`→`order`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** PASS + plugin-canvas suite.
- [ ] **Step 5:** Commit `plugin-canvas: scene/2 migrates straight to the final Element2D shape`.

---

## Phase B — The editor core (3D moves onto it first)

### Task B.1: `SceneEditor` store and `DimensionConfig`

**Files:**

- Create: `packages/ui/react-ui-canvas/src/editor/` — `store.ts`, `config.ts`, `index.ts`, `store.test.ts`
- Modify: `packages/ui/react-ui-canvas/src/index.ts` (export `SceneEditor`)

**Interfaces:**

- Produces:
  `type DimensionConfig<E, C, S> = { dim; viewport: ComponentType<ViewportProps>; tools: ToolDef[]; geometry:
GeometryOps<E>; camera: CameraOps<C>; display: DisplayOptions; sections: InspectorSectionDef[]; propertyForm:
Schema.Schema.Any; styles: StyleOps<S> }`;
  `type ViewportProps = { document: SceneDocument; scene: string; editing: string; selection: readonly string[];
tool: ToolDef; readonly: boolean; onSelect(ids: string[]): void; onIntent(intent: LayoutIntent): void;
onPreview(intent: LayoutIntent | undefined): void; onContextMenu(at: Point, target?: string): void }`;
  `createEditorStore(registry): EditorStore` with atoms `selection`, `tool`, `editing` (drill path), `face`
  (3D-only, ignored by 2D), `preview` (in-flight gesture, decision 8).
  `ToolDef = { id; icon; label; category: 'select' | 'transform' | 'create' | 'lock'; kind?: string; key? }`.
- **Parity:** all shared; `face` documented as dimension-specific state.

- [ ] **Step 1: Failing test** `store.test.ts`: `test('selection, tool and drill path are atoms the panels and
viewport share', …)`; `test('a preview never writes the document', …)` (set `preview`, assert the ECHO layout
      unchanged).
- [ ] **Steps 2–5:** FAIL → implement → PASS (react-ui-canvas suite) → commit `react-ui-canvas: SceneEditor store and
DimensionConfig`.

### Task B.2: One command table

**Files:** Create `src/editor/commands.ts` (+test). Absorb react-ui-canvas `utils/scene-menu.ts`
(`SceneCommands`, `commandMenuItems`) and plugin-canvas `SceneView3D` command callbacks.

**Interfaces:**

- Produces: `buildCommands(ctx: { store; document; config; history; clipboard; readonly }): CommandTable` with
  `Command = { id; label; icon; shortcut?; enabled: boolean; run(): void }` for undo, redo, cut, copy, paste,
  duplicate, delete, group, ungroup, make-object, plus `config`-supplied extras (2D: align/distribute; 3D: join,
  subtract, import mesh, export STL). Keymap derived from the table (one source for actions bar, context menu,
  shortcuts, app edit commands).
- **Parity:** shared table; extras per config.

- [ ] **Step 1: Failing test** `test('2D and 3D configs yield the same shared commands for the same state', …)`;
      `test('locked leaves only copy enabled', …)`; `test('the keymap is derived from the table', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: one command table for both dimensions`.

### Task B.3: History and clipboard in the core

**Files:** Move plugin-canvas `SceneArticle/canvas-history.ts` and `scene-clipboard.ts` into
`react-ui-canvas/src/editor/history.ts`, `clipboard.ts` (+tests moved); delete the originals.

**Interfaces:**

- Produces: `createHistory(canvasKey): History` — canvas-session stacks of inverse `LayoutIntent`/`ModelIntent`
  batches; remote edits skipped; field-level inverses (`writeFields`). `createClipboard()` — `.dx` text on the system
  clipboard + session fallback; lift/flatten across dims (`liftScene`/flatten).
- **Parity:** shared.

- [ ] **Step 1: Failing test** `test('undo after a peer edited another field keeps the peer field', …)` (Review
      Focus 3: two `Obj` writes, undo, assert peer field); existing clipboard tests move and still pass.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: history and clipboard move into the core`.

### Task B.4: Panels as `SceneEditor` parts

**Files:** Create `src/editor/SceneEditor.tsx` (+stories later in F), generalising existing pieces in
`components/panels/*` (ToolsPanel/ToolRail, DisplayPanel, InspectorPanel), `Canvas/CanvasBars.tsx` (`CanvasActions`,
`CanvasCamera`, `CanvasTheme`), `SceneContextMenu`.

**Interfaces:**

- Produces: `SceneEditor.Root`, `.Viewport`, `.Tools`, `.Actions`, `.Camera`, `.Display`, `.Inspector`,
  `.ContextMenu` (composite per the composite-components skill); role handling (card/section/slide: viewport only);
  lock; inspector dock (`useInspectorDock` moved from plugin-canvas). Display: theme picker selects the default style
  catalog; grid kind; snap toggle (both dims); guides only when `config.display.guides`.
- **Parity:** all shared; sections and display options from config.

- [ ] **Step 1: Failing test** `SceneEditor.test.tsx` (happy-dom): `test('both configs render the same regions', …)`
      (tool rail, actions, camera, display, inspector present by test id); `test('card role renders the viewport only',
…)`; `test('snap toggle is independent of the grid toggle', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: SceneEditor panels`.

### Task B.5: Shared inspector sections over the scene model

**Files:** Generalise `components/inspectors/*` (Properties, Views, Objects, Layers) to read `SceneDocument` +
store; add `Styles` section. Move plugin-canvas `inspectors-3d.ts`/`element-form.ts` logic into per-dimension
adapters in the configs.

**Interfaces:**

- Produces: `PropertiesSection` (form from `config.propertyForm`, style reference + overrides, vectors via
  `VECTOR_AXIS_LAYOUT`), `ViewsSection` (layout tree, drill-in, scenes list), `ObjectsSection` (model objects; place,
  make object, edit parts; config extras e.g. import mesh), `LayersSection` (hide/lock on `BaseElement.layer`),
  `StylesSection` (model styles then catalogs; "new style from selection").
- **Parity:** shared components; adapters per config.

- [ ] **Step 1: Failing tests** per section (happy-dom): Views lists scenes and drills; Objects place emits a
      `create` with `object`; Layers hide removes elements from `config.geometry.visible`; Styles "new style from
      selection" emits a `ModelIntent` defining a style and an `update` setting `style`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: shared inspector sections incl. Styles`.

### Task B.6: 3D config and viewport on `SceneEditor`

**Files:**

- Create: `packages/ui/react-ui-scene/src/editor/config3d.ts` (+test), `Viewport3D.tsx`
- Modify: `components/Scene3DEditor/*` (becomes `Viewport3D`: render, pick, gizmos, face select, drag-to-create;
  emits intents/previews only); renderer applies `Style3D` via `resolveStyle`; CAD/Presentation become default
  `StyleCatalog`s.
- Modify: `packages/plugins/plugin-canvas/src/containers/SceneArticle/SceneView3D.tsx` → replaced by
  `<SceneEditor.Root config={config3d}>` in `SceneArticle`.

**Interfaces:**

- Produces: `config3d: DimensionConfig<Element3D, Camera3D, Style3D>`; `Viewport3D: ComponentType<ViewportProps>`.
- **Parity:** 3D viewport only; everything else shared.

- [ ] **Step 1: Failing test** `config3d.test.ts`: `test('gizmo drag previews in memory and commits once on
release', …)` (simulated drag: N `onPreview`, 1 `onIntent`); `test('Presentation and CAD are default style
catalogs', …)`.
- [ ] **Steps 2–4:** FAIL → implement → PASS (react-ui-scene, plugin-canvas suites).
- [ ] **Step 5: Browser:** SceneArticle `Scene3D` story — select, move/rotate/scale, create, face select, context
      menu, undo/redo, styles section, display panel; no console errors.
- [ ] **Step 6:** Commit `react-ui-scene: 3D runs on SceneEditor`.

---

## Phase C — The 2D viewport on intents

### Task C.1: 2D render list from `Layout2D`

**Files:** Create `packages/ui/react-ui-canvas/src/viewport2d/render-list.ts` (+test). Modify `SceneLayer` to draw
from `RenderItem2D` (resolved element + resolved `Style2D`) instead of `View` nodes/links.

**Interfaces:**

- Produces: `toRenderList2D(doc: SceneDocument, layout: string, registry: ElementKindRegistry): RenderList2D`
  (items with resolved objects, styles, ports, routed links); `ElementKindRegistry` replaces `NodeRegistry`
  (`kind → { name, icon, schema, render, fields, animatable }`).
- **Parity:** 2D-only render list; 3D already has `renderList`. Shared: object/style resolution.

- [ ] **Steps:** failing test `test('the corpus renders every node and link type', …)` (count and kinds) → implement
      → PASS → commit `react-ui-canvas: 2D render list over Layout2D`.

### Task C.2: 2D gestures emit intents; previews in memory

**Files:** Modify react-ui-canvas `hooks/canvas/*` (drag, resize, rotate, marquee, port-drag link, drag-to-size,
point edit) and `engine/controller.ts` to call `onPreview`/`onIntent` with `LayoutIntent`s; selection via
`onSelect`. Create `src/viewport2d/Viewport2D.tsx` (+test).

**Interfaces:**

- Produces: `Viewport2D: ComponentType<ViewportProps>`; `config2d: DimensionConfig<Element2D, Camera2D, Style2D>`
  (`src/viewport2d/config2d.ts`).
- **Parity:** shared gesture rules (click/shift/marquee/create-tool select, Cmd-drag hand, drag-to-size) via shared
  helpers already in `utils` (`pressSelects`, `isHandDrag`, `boundsFromPoints`); 2D-specific geometry.

- [ ] **Step 1: Failing test** `test('a drag of 200 elements writes once on release', …)` (Review Focus 2: count
      ECHO writes via a recording layout proxy); `test('resize emits a scale intent at release', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: 2D gestures commit intents on release`.

### Task C.3: 2D on `SceneEditor` in plugin-canvas

**Files:** Replace `SceneView2D.tsx` usage in `SceneArticle.tsx` with `<SceneEditor.Root config={config2d}>`;
`CanvasEditCommands`/`CanvasClipboardText` reduce to the core's app-command bridge.

- [ ] **Step 1: Failing test** (happy-dom, plugin-canvas): `test('a 2D canvas edits through LayoutIntent', …)`
      (create + move → `Layout2D` changed; no `View` store involved).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Browser:** SceneArticle `Scene2D` story at parity with the current 2D canvas (tools, handles, links,
      portals drill-in, layers, styles, context menu, undo).
- [ ] **Step 6:** Commit `plugin-canvas: 2D runs on SceneEditor`.

---

## Phase D — Modes on the shared model

### Task D.1: Lattice

**Files:** Port `engine/projections/lattice.ts` to a `LayoutIntent` rewriter: `latticeConstrain(layout: Layout2D,
intent: LayoutIntent): LayoutIntent | undefined`; config2d selects it when `layout.lattice` is set.

- [ ] Failing test `test('a move lands on whole lattice cells', …)` (port the existing lattice tests) → implement →
      PASS → commit `react-ui-canvas: lattice mode on Layout2D`.

### Task D.2: Constrained and dynamic

**Files:** Port `constrained.ts` and `dynamic.ts` (their models are `Layout2D.constraints` / `graph`, A.1).

- [ ] Failing tests ported from `constrained.test.ts`/`dynamic.test.ts` (solver re-places after a move; renaming the
      layout keeps the model) → implement → PASS → commit `react-ui-canvas: constrained and dynamic modes on Layout2D`.

### Task D.3: Scored

**Files:** The scoring utilities read `RenderList2D`.

- [ ] Failing test `test('the score over a Layout2D equals the score over the corpus', …)` → implement → PASS →
      commit `react-ui-canvas: scored mode on Layout2D`.

---

## Phase E — Retire the split and move consumers

### Task E.1: Delete the adapters

Delete plugin-canvas `model/layout-writer.ts`, `canvas-content.ts`, `layout-store.ts`'s View binding,
`SceneArticle/SceneView2D.tsx`, `SceneView3D.tsx`, react-ui-scene `canvas/adapter.ts` View mapping; move their still
needed tests to the new modules. Commit `plugin-canvas: remove the View adapters`.

### Task E.2: plugin-canvas operations, import and samples

(The builder and handler moved in 0.4.) `operations/apply.ts`/`patch*.ts`, `import/tldraw*`, samples and stories
build `Layout2D` + intents. Failing test per operation (`Apply` creates elements in the open layout; tldraw import produces
`Element2D`s) → implement → PASS → commit `plugin-canvas: operations and conversion on Layout2D`.

### Task E.3: react-ui-canvas-compute and plugin-conductor (decision 10)

Compute shapes become element kinds in an `ElementKindRegistry`; `scene/echo-store.ts` and `scene/projection.ts`
use `Layout2D` + intents; `CanvasBoard` renders `SceneEditor` with a compute config (its own tools and sections).
Failing tests ported from `scene.test.ts`, `echo-store.test.ts`, `createComputeGraph.test.ts` → implement → PASS;
browser-check the compute stories and plugin-conductor's board; commit `react-ui-canvas-compute: compute board on the
shared model`.

### Task E.4: plugin-uml

`ClassNode` becomes an element kind (`ElementKindSpec` replaces `NodeDefSpec`; `nodeBase` fields → `Element2D`);
failing test `ClassNode.test.ts` updated → PASS; story check; commit `plugin-uml: class shapes as element kinds`.

### Task E.5: plugin-code and small consumers

plugin-code graphs (`DefinitionGraph`, `ChangelogGraph`, `SpecModel`) build `Layout2D` with `lattice`; plugin-debug,
plugin-code-graph, react-ui-scene `Scene2DView` updated; tools/autocue unchanged (utilities only). Tests per package
→ PASS; commit `plugins: code, debug and graph views on the shared model`.

### Task E.6: Remove the old model

Delete react-ui-canvas `model/types.ts`'s `View`/`Node`/`Link`/`Intent`, `model/store.ts` (`ViewStore`,
`createMemoryStore`), `model/intent.ts`, engine projection plumbing that only served them; keep geometry/camera/layout
utilities.

- [ ] **Gate:** `grep -rnE "\b(ViewStore|createMemoryStore|reduceIntent|withLegacyView)\b|type Intent\b" packages --include=*.ts --include=*.tsx`
      returns nothing outside migration code; every package's tsc/lint/tests pass (`MOON_CONCURRENCY=4 moon run
:test -- --no-file-parallelism` in the background).
- [ ] Commit `react-ui-canvas: retire the View model, Intent and ViewStore`.

---

## Phase F — Tests and storybooks for review (decision 9)

### Task F.1: Storybooks per aspect, 2D and 3D side by side

Add/extend stories (each with numbered Test steps in the doc comment, `withTheme()`, translations):

- `SceneEditor` — `Scene2D`, `Scene3D`, `SideBySide` (both configs in one story).
- Panels — `Tools`, `Actions`, `Camera`, `Display` (grid kinds, snap, theme catalogs), `Inspector` (docked/floating).
- Inspector sections — `Properties`, `Views` (scenes list, drill-in), `Objects` (place, make object, parts),
  `Layers` (hide/lock), `Styles` (model styles, catalogs, new style from selection).
- Tools — select/marquee, hand/Cmd-drag, create (2D box, 3D base+height), link, transform, extrude/face (3D).
- Editing — clipboard (copy/cut/paste/duplicate, 2D↔3D paste), undo/redo, context menu, lock.
- Modes — `Lattice`, `Constrained`, `Dynamic`, `Scored`.
- Roles — `Card`, `Section`, `Slide` (no chrome) for both dims.
- Consumers — compute board, UML class diagram, code graph.

### Task F.2: Play tests and e2e coverage

Storybook play functions for the editing stories (clipboard, undo, context menu, create, lock) run by
`moon run react-ui-canvas:test-storybook` and `plugin-canvas:test-storybook`; one Playwright spec in composer-app
opening a 2D and a 3D canvas, editing, reloading.

### Task F.3: Fresh whole-branch review

A fresh reviewer on the most capable model against this plan's Review Focus; one fix pass with RED→GREEN tests.

---

## Risks

1. **Data parity (Phase A):** react-ui-canvas records carry many type-specific fields; a missed field loses data on
   migration. Mitigation: A.1's `FIELD_MAP` test is generated from the record schemas, and A.3's corpus round-trip.
2. **Drag performance (C.2, B.6):** writing ECHO per pointer move would stutter. Mitigation: decision 8 — previews in
   atoms, one intent on release; C.2's write-count test.
3. **Undo with peers (B.3):** inverse intents could revert a peer's concurrent field edit. Mitigation: field-level
   inverses (`writeFields`) and the peer test; whole-document undo steps (Make object) are replaced by inverse
   `ModelIntent`s.
4. **Consumer breakage (Phase E):** compute, UML and code graphs depend on the old model. Mitigation: E.3–E.5 before
   E.6, and E.6's grep gate plus the full test sweep.
5. **Diagram corpus stability (Phase 0):** the illustrator corpus metrics and snapshots (`corpus.test.ts`) and the
   render-diagrams output must stay stable; only the output stage of the engines changes. Mitigation: 0.2's geometry
   equivalence test, 0.3's before/after renders, 0.5's gate.
6. **Existing `.dx.svg` files:** files exported before Phase 0 are not imported as editable drawings (user, 2026-10-30); they still display as images.
7. **Scope:** Phase E (especially compute) is large; the plan keeps every phase green so the PR is shippable at the
   end of each phase.

## Relative size

| Phase                     | Tasks | Relative size                                                                 |
| ------------------------- | ----- | ----------------------------------------------------------------------------- |
| 0 — one DSL target        | 5     | L (engines' output stage, renderer, illustrator ops; corpus must stay stable) |
| A — data model            | 3     | M                                                                             |
| B — editor core, 3D first | 6     | L                                                                             |
| C — 2D viewport           | 3     | L                                                                             |
| D — modes                 | 3     | M                                                                             |
| E — retire + consumers    | 6     | XL (compute board is the largest single task)                                 |
| F — review aids           | 3     | M                                                                             |
