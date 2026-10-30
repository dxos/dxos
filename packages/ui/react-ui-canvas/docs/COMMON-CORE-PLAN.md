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

**Spec:** `packages/ui/react-ui-canvas/docs/COMMON-CORE.md` (decisions 1–20; step 0 = one DSL target; the element base is
react-ui-canvas's current schema, decision 12). Spec decisions are recorded in
`packages/common/scene/SPEC.mdl` (latest D-89+).

## Rulings during execution (pending user review)

- **R-1 (2026-10-30, coordinator): `Scene.Command` stays as the interchange protocol for external formats.** It is a
  protocol between the diagram engines and four backends (`ContentHandler`: SVG, tldraw, excalidraw, canvas), not
  just the canvas's input. The canvas backend and the SVG renderer move to `Layout2D` (the canvas handler emits
  `LayoutIntent`s); tldraw and excalidraw keep consuming commands. Task 0.5 retires the commands as a _data model_
  only. Rejected: three new `Layout2D` → tldraw/excalidraw/SVG converters with read-back (not in scope). Cost if
  wrong: those converters later.
- **R-2: phase A's data re-base (A.1, A.4) runs before tasks 0.2–0.4,** so phase 0 emits the final element shape
  instead of stage 2's (`kind`/`order`/`from`/`to`) and nothing is redone. Order: 0.1 (done) → A → 0.2–0.5 → B → C.
- **R-3: diagram objects become relative composites (decision 18) once the canvas renders instance `scale` (C.1).**
  Until then canvas output stays flattened, so diagrams don't change appearance. The composite switch is a task at the
  end of C.
- **R-4 (2026-10-30, user): a diagram drawn onto the 2D canvas keeps the canvas's own link routing.** Link elements
  store only their endpoints, so the diagram engine's routed bends are dropped (app-framework: 19 → 0), as the legacy
  canvas did; SVG, tldraw and excalidraw output keep them. Rejected: an optional `route` on link elements drawn while
  both ends stay put, as `DiagramConnector` does. Cost if wrong: that field and its invalidation rule later.
- **R-5 (2026-10-30, user): diagram objects become relative composites in E.2, not C.4.** A link end can name an
  element inside a composite, so a cross-object arrow keeps attaching to the shape, not the composite's frame. C.4
  delivered the instance scale only (9e5c3e81f44); the composite switch moves to E.2's diagram handler rewrite.
- **R-6 (2026-10-30, user): the engine's `class`/`style` rename (C.5) folds into E.1.** The names are retired with
  the View model that stores them; no ECHO migration.
- **R-7 (2026-10-30, user): decision 20's `black`/`white` hues are approved.**
- **R-8 (2026-10-30, agent, D.1): a mode is a rule between an edit and its write, over the document's
  `Scene.LayoutRecord2D`.** `latticeConstrain(layout: Scene.LayoutRecord2D, intent: LayoutIntent)` lives in
  react-ui-canvas `src/modes/` (the editor holds records, not the ECHO `Layout2D` class). `DimensionConfig.constrain(layout,
  intent, { snap })` is applied by `SceneEditor` to every write (gestures, commands, paste, the Properties form);
  config2d selects the lattice when `layout.lattice` is set and snapping is on. The 2D viewport still wraps the canvas
  engine (C.1's `RenderList2D` was not built), so it also drives the engine with a lattice projection from
  `layout.lattice` for the drag preview and guides, and redraws a drag the mode refuses or rewrites as stored. The
  engine projections stay until E.6. Cost if wrong: the rule runs twice per drag (engine and editor), which is
  idempotent but redundant until E.6 removes the engine's.
- **R-9 (2026-10-30, agent, D.1): plugin-canvas keeps the Canvas settings (`lattice`, `projection`) as its mode
  switch until E.2.** The scene/2 migration does not write `Layout2D.lattice`, and config2d leaves the layout's mode
  off when a host passes its own projection. Cost if wrong: in plugin-canvas a lattice canvas is held to its cells by
  the engine only (a paste or a Properties edit is not snapped) until E.2 moves the switch onto the layout.
- **R-10 (2026-10-30, agent, D.1, parity): 3D gets no lattice.** `lattice` is a 2D-only layout field (A.1); the
  `constrain` hook is shared, so a 3D mode would plug in the same way.
- **R-11 (2026-10-30, agent, D.2): a layout is dynamic when its `arrange` is `{ kind: 'dynamic' }`.** The plan names a
  `graph` field A.1 never added; `arrange` is the existing typed field for "how the layout places elements with no
  position", and `applyIntent` already pins an element a person moves in an arranged layout, which is exactly the
  overlay. The graph is the layout's shapes (nodes) and links (edges); the overlay is the pinned shapes' centres;
  `arrange.params.arrange` picks the engine's arrangement. `dynamicConstrain` pins a shape whose centre an edit
  changes (the engine writes a drag as the whole element, not a `move`) and, when the graph changes, re-places every
  unpinned shape. Cost if wrong: a dedicated field later and a rewrite of `arrange.kind` in stored layouts.
- **R-12 (2026-10-30, agent, D.2): constrained mode is ported but not wired — blocked on a write path.**
  `constrainedConstrain(layout, intent)` returns the rewritten intent and the layout's new `constraints`, but the
  shared write path (`LayoutIntent`, plugin-canvas `applyLayoutIntent`, the `layoutSource` history) reaches only
  elements, so nothing can write `Layout2D.constraints` as one undoable step with the positions. Needs a user ruling:
  (1) a `LayoutIntent` kind for layout fields, written and undone with the elements; (2) constraints stored on their
  subject element; (3) a host callback like `onLayersChange` (not undoable). Until then plugin-canvas's constrained
  canvases keep the engine projection over `layout.props.constrained`. Cost if wrong: none yet; the rule is pure.
- **R-13 (2026-10-30, agent, D.2, parity): 3D gets neither dynamic nor constrained mode in this phase.** Both are
  2D-only today (the engine's projections); the shared `constrain` hook is where a 3D arrangement would plug in.
- **R-14 (2026-10-30, agent, D.3): scoring reads a `Layout2D` through the 2D viewport's read model, not a
  `RenderList2D`.** C.1's `RenderList2D` was not built (the viewport reads layouts through react-ui-scene's
  `toCanvasView`), so `scoreLayout2D(document, layout, registry, objective?)` and `layoutDiagramObjects` live beside
  that adapter in react-ui-scene `src/canvas/score.ts` and grade the layout exactly as the canvas draws it. Cost if
  wrong: a move next to `toRenderList2D` once it exists; the scorers do not change. Parity: scoring is 2D-only, as the
  diagram `Objective` grades 2D diagram objects.
- **R-15 (2026-10-30, user, D.2): R-12 option 1 — constraints are written through a layout-field intent, undone
  together with the elements.** The agent's shape (2026-10-30, agent): `LayoutIntent` gains
  `{ kind: 'layout'; patch: LayoutPatch }`, where `LayoutPatch` is the 2D layout fields a mode owns (`lattice`,
  `constraints`; `layers` can join later): a key with a value sets the field, a key set to `undefined` unsets it, an
  absent key leaves it; a batch's patches merge in order. `applyIntent` applies it with the element intents (3D ignores
  it; `isLayoutIntent(…, '3d')` refuses it), plugin-canvas `applyLayoutIntent` writes the changed fields in the same
  `Obj.update`, and `layoutSource` versions `['lattice', …]` and `['constraints']` so undo/redo restores both.
  `constrain2D` selects constrained mode when the layout's `constraints` is set (even empty), ahead of lattice and
  dynamic and regardless of snapping (the solver owns placement), and emits `batch[rewritten intent, layout patch]`
  only when the edit moved, created or deleted a shape. plugin-canvas still keeps its engine projection as the mode
  switch (R-9). Cost if wrong: the patch shape is in the intent schema, so a rename touches stored-intent consumers
  (none persist intents today).

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
`src/engine/projections/{constrained,dynamic,lattice}.ts`, plugin-canvas `model/image-node.ts` and `model/handler.ts`
(`SceneHandler`, the diagram → canvas translation), `@dxos/animation` `Timeline`, and every type and command in
`@dxos/diagram` `src/scene.ts`, against `@dxos/scene` `Scene.ts`. With decisions 12–15 (the element base is
react-ui-canvas's current schema) most earlier gaps close. What remains:

1. **Resolved — plugin kinds (decision 13).** Plugin kinds extend the base as today
   (`Schema.Struct({ ...elementBase, type: Literal('class'), … })`, e.g. plugin-uml `ClassNode`, plugin-canvas
   `ImageNode` at `plugins/plugin-canvas/src/model/image-node.ts:17`, the compute shapes); the layout store validates
   the base and preserves unknown fields; the kind registry validates each kind's fields.
2. **Accepted, not mechanical — constrained and dynamic models (decision 14).** `ConstrainedModel {nodes,
constraints}` (`engine/projections/constrained.ts:36-44`) and `GraphModel {nodes, edges}` + `Overlay.positions`
   (`engine/projections/dynamic.ts:69-77`) are normalised onto elements; the projections change (Phase D).
3. **Resolved — one animation system (decision 16).** The canvas timeline (`model/timeline.ts`) is retired; 2D
   timelines migrate into animator shots (Task A.5); a shared Timeline panel (Task B.7) edits shots in both dimensions.
4. **Resolved — diagram object frames (decision 18).** Each `WorldObject` (`scene.ts:289-307`) becomes a composite
   (its elements in local units = the object's own coordinates) placed by one `instance` element carrying `center` =
   `origin`, `scale`, and `z` = `index`; `MoveObject` moves the instance. plugin-canvas `SceneHandler`'s flattening
   (`handler.ts:206-541`) is dropped. Sharing rule (agent call): one composite per diagram object; objects share a
   composite only when the source declares reuse (a `.dx` scene `model`/`object` placed by several elements);
   structural de-duplication is deferred. The SVG renderer and both viewports draw parts through the instance
   transform (strokes and text scaled); the corpus metric gate confirms identical diagrams.
5. **Resolved — one 2D style vocabulary (decisions 19, 20).** `Style2D` = `NodeStyle` + `lineStyle: 'sketchy'`,
   `pattern`, `weight`; diagram `color`/`fill`/`stroke`/`weight` map onto it (DSL mapping below) and disappear from
   elements, so diagram-styled elements take catalog styles. Pending user override: the added `black`/`white` hues
   (decision 20).
6. **Accepted, not mechanical — diagram arcs and free curves (decision 14).** `SceneHandler` has no case for `line`,
   `curve` or `arc` (`handler.ts:314-441` handles rect/diamond/triangle/ellipse/circle/text/portal/arrow), so today
   they never reach the canvas; react-ui-canvas's `DiagramShape` is `Box|Circle|Text|Portal` (`types.ts:375`). New
   types and 2D draw code are needed (Task C.1).
7. **Resolved — 3D renames and groups (decisions 12, 17).** 3D adopts `type`/`z`/`source`/`target`; 3D groups become
   composites placed by `instance` elements and the ring/grid arrangers move onto composites; `members`/`arrange` are
   removed; the `.dx` scene statements keep their text (reader/printer change only). Task A.4.

Behaviours: nothing found that can't be shared. Projection-owned positions exist only in 2D today; the contract keeps
them as an optional `config.constrain` hook.

## Canvas data mapping

With decision 12 the mapping is near-identity: react-ui-canvas records become `@dxos/scene` elements **by copy**. Only
these change: **R** = rename; **S** = structural (the decided split); **N** = not mechanical. Everything not listed
copies as is (same name, same shape). Round-trip tests: Task A.3, one test per row group. The data-mapping tasks (0.1,
A.1–A.4) change no engine behaviour; engine changes are confined to Phases C and D.

| Record (`types.ts`)                                                                                                                 | Field(s)                                                                                                                                                                   | New home                                                                                                                                |     |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **View** (`:678`)                                                                                                                   | `id`                                                                                                                                                                       | `Layout2D.key`                                                                                                                          | R   |
|                                                                                                                                     | `nodes` + `links`                                                                                                                                                          | `Layout2D.elements` (one map; a link is an element with `source`/`target`)                                                              | S   |
|                                                                                                                                     | `name`, `layers`, `anonymous`                                                                                                                                              | copied onto `Layout2D`                                                                                                                  | —   |
|                                                                                                                                     | `kind: composite`                                                                                                                                                          | `Model2D.objects[id]` with `parts` = that layout                                                                                        | S   |
| **Node / link base** (`:171`, `:560`)                                                                                               | `id`, `type`, `z`, `locked`, `layer`, `label`, `text`, `ports`, `portsPerSide`, `exposed`, `center`, `size`, `rotation`, `source`, `target`, `ends`, `connector`, `points` | copied (shared base; geometry on `Element2D`)                                                                                           | —   |
|                                                                                                                                     | `class`                                                                                                                                                                    | `style` (named style reference)                                                                                                         | R   |
|                                                                                                                                     | `style` (`NodeStyle`/`LineStyle`)                                                                                                                                          | `overrides: Partial<Style2D>`                                                                                                           | R   |
| **NodeStyle** (`:140`) — extended (decision 19): `lineStyle` + `sketchy`, `pattern`, `weight`; hues + `black`/`white` (decision 20) | all fields                                                                                                                                                                 | `Style2D` (= `NodeStyle`)                                                                                                               | —   |
| **Built-in node types** (rect, ellipse, cloud, polygon, polyline, note, view, instance, path, diagram, generator)                   | own fields (`params`, `points`, `scene`, `link`, `composite`, `overrides`, `fit`, `d`, `viewBox`, `element`, `heading`, `generator`, `seed`)                               | copied; each type keeps its schema (`Schema.Struct({ ...elementBase, type, … })`)                                                       | —   |
| **view / instance**                                                                                                                 | `scene`, `composite`                                                                                                                                                       | `object` → the composite model object; instance gains `center`/`scale`/`rotation`/`fit` (decision 18; portal views keep `fit: 'frame'`) | S   |
| **Plugin kinds** (image, UML class, compute shapes)                                                                                 | own fields                                                                                                                                                                 | copied; schemas registered in the kind registry (decision 13)                                                                           | —   |
| **Layer** (`:625`)                                                                                                                  | `id`, `name`, `z`, `hidden`                                                                                                                                                | copied into `Layout2D.layers`                                                                                                           | —   |
| **StyleClass** (`:525`)                                                                                                             | `id`, `name`, `style`                                                                                                                                                      | `Model2D.styles[id] = { name, ...style }`                                                                                               | S   |
| **Lattice** (`utils/lattice.ts:15`)                                                                                                 | `LatticeSpec`                                                                                                                                                              | `Layout2D.lattice`                                                                                                                      | —   |
| **Constrained** (`constrained.ts:41`)                                                                                               | `nodes`, `constraints`                                                                                                                                                     | `Layout2D.constraints`; nodes derived from elements                                                                                     | N   |
| **Dynamic** (`dynamic.ts:69`)                                                                                                       | `edges`, `Overlay.positions`                                                                                                                                               | link elements; element centers                                                                                                          | N   |
| **Timeline** (`model/timeline.ts`)                                                                                                  | all                                                                                                                                                                        | an animator `Shot` over the migrated scene; keys rewritten to element paths (Task A.5)                                                  | S   |
| **Canvas settings**                                                                                                                 | all                                                                                                                                                                        | `Canvas.settings` (unchanged); `theme`/`styleSet` choose the default `StyleCatalog`                                                     | —   |

**3D (decision 12):** `@dxos/scene`'s `kind`→`type`, `order`→`z`, `from`/`to` `Binding`→`source`/`target` `Endpoint`,
shared `Style` tokens → `overrides: Partial<Style3D>`, groups (`members`/`arrange`) → composites + `instance` (decision 17). Task A.4.

## Diagram DSL mapping

Only the output target changes. Grammar changes: **none** (the `.dx` text is unchanged; the scene-statement
reader/printer map `kind`/`from`/`to`/groups onto `type`/`source`/`target`/composites). `Dsl.compile`'s result type
changes (`ParseResult.commands` → `{ document, layout, intents }`).

| `@dxos/diagram` (`scene.ts`)                                                         | → `@dxos/scene`                                                                                                                                                               |                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `WorldObject {id, origin, scale, index, ref, elements}` (`:289`)                     | composite `Model2D.objects[id]` (its `parts` = the elements, local units) + one `instance` element `{ object: id, center: origin, scale, z: index }`; `ref` → the portal link | M (decision 18) |
| `Box rect\|diamond\|triangle\|ellipse {x, y, w, h, rotation, text, corners}` (`:68`) | part: `rect`/`ellipse` or `diagram` node (`element` = shape) with `center`/`size` from x, y, w, h; `label` = text                                                             | M               |
| `Circle {cx, cy, r, text}` (`:85`)                                                   | part: `ellipse` with `size` = 2r                                                                                                                                              | M               |
| `Text {x, y, w, text}` (`:137`)                                                      | part: `diagram` text node (or caption/heading on its owner, as today)                                                                                                         | M               |
| `Portal {x, y, w, h, ref, text}` (`:267`)                                            | part: `view` node, `link` = DXN, `fit: 'frame'`                                                                                                                               | M               |
| `Arrow {from, to, start, end, text, head, tail, relation}` (`:208`)                  | link: `source`/`target` `{node: object/element, port}` or `{point}`; `ends`; `connector {relation, head, tail, route, caption}`; `label`                                      | M               |
| `Polyline`, `Curve`, `Arc` (`:97-136`)                                               | **new** part types + 2D draw code                                                                                                                                             | N (6)           |
| `fill` none / solid / tint / pattern                                                 | `fill: false` / `fill: true, tone: 1` / `fill: true, tone: 3` / `fill: true, pattern: true`                                                                                   | M               |
| `stroke` sketchy/solid/dashed/dotted                                                 | `lineStyle` (incl. `sketchy`)                                                                                                                                                 | M               |
| `weight` s/m/l/xl                                                                    | `weight`                                                                                                                                                                      | M               |
| `color` red/orange/green/blue/violet                                                 | same hue                                                                                                                                                                      | M               |
| `color` light-red/light-green/light-violet                                           | red/green/violet + lighter tone                                                                                                                                               | M               |
| `color` light-blue / yellow / grey                                                   | `sky` / `amber` / `neutral`                                                                                                                                                   | M               |
| `color` black / white                                                                | new hues `black` / `white` (decision 20, pending override)                                                                                                                    | M               |
| element `id`                                                                         | `dsl: { object, element }`; part id = element id within the composite                                                                                                         | M               |
| `UpsertObject` (`:317`)                                                              | `ModelIntent` define/update the composite + `create`/`update` the instance, one `batch`                                                                                       | M               |
| `UpsertElements` (`:322`)                                                            | `ModelIntent` update of the composite's parts                                                                                                                                 | M               |
| `RemoveElements` (`:328`)                                                            | `ModelIntent` removing parts                                                                                                                                                  | M               |
| `RemoveObject` (`:334`)                                                              | `delete` the instance (+ remove the composite when unused)                                                                                                                    | M               |
| `MoveObject {origin}` (`:339`)                                                       | `update` the instance's `center`                                                                                                                                              | M               |

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
   → edit → store with no field lost. Pinned by Task A.3's corpus test.
2. **Drag smoothness:** a 2D drag of 200 elements and a 3D gizmo drag write ECHO once, on release. Pinned by Task C.2.
3. **Undo with a peer:** an undo after a peer edits another field of the same element keeps the peer's field. Pinned
   by Task B.3.
4. **Projections own positions:** in lattice/constrained/dynamic modes a move intent may be rewritten or refused; the
   viewport previews via `constrain` before release. Pinned by Tasks D.1–D.3.
5. **Consumer breakage:** nothing imports the retired `View`/`Intent`/`ViewStore` (Task E.6 grep gate), and compute,
   UML and code graphs render and edit. Pinned by Tasks E.3–E.5.

---

## Phase 0 — One DSL target (decision 11)

The `.dx` semantic statements (`diagram`/`node`/`edge`/`group`) and the layout engines currently produce
`@dxos/diagram` `Scene.Command`s (`UpsertObject`/`UpsertElements`/`RemoveElements`/`RemoveObject`/`MoveObject` over
`WorldObject`s of `Box`/`Circle`/`Polyline`/`Curve`/`Arc`/`Text`/`Arrow`/`Portal`, `common/diagram/src/scene.ts`);
`Dsl.compile` returns `ParseResult { commands, problems, ranges }` (`dsl/parse.ts`). Phase 0 makes every engine emit
`@dxos/scene` `Layout2D` elements + model objects through one `LayoutIntent` batch, and moves every reader onto
`Layout2D`.

### Task 0.1: The canvas element base in `@dxos/scene`, diagram types included

**Files:**

- Create: `packages/common/scene/src/element.ts` (the shared `elementBase`, `Endpoint`, `Port`, `NodeStyle`/`Style2D`,
  the built-in 2D types and `diagram` types — moved from react-ui-canvas `src/model/types.ts`, names and shapes kept)
- Modify: `packages/common/scene/src/Scene.ts`, `src/index.ts`; react-ui-canvas `src/model/types.ts` re-imports them
  (no re-export left in react-ui-canvas)
- Test: `packages/common/scene/src/element.test.ts`

**Interfaces:**

- Produces: `elementBase` (react-ui-canvas `nodeBase` + `linkBase` fields; `class`→`style`, `style`→`overrides`),
  `Element2D` (union of the built-in types over `elementBase`), `dsl?: { object; element? }` on the base, new
  `diagram` element types `polyline`/`curve`/`arc` (divergence 6), the instance transform `{ object; center; scale?;
rotation?; fit?: 'none' | 'frame' }` (decision 18), `Style2D` = `NodeStyle` + `sketchy`/`pattern`/`weight` and the
  `black`/`white` hues (decisions 19, 20).
- **Parity:** the base is shared; 2D types are 2D; 3D adopts the base in A.4.

- [ ] **Step 1: Failing test** `test('the scene element base has every react-ui-canvas node and link field', …)`
      (property names of `nodeBase`, `linkBase`, each built-in type ⊆ the new schemas, with only `class`/`style` renamed);
      `test('a plugin kind extends the base and keeps its own fields through the layout store', …)`.
- [ ] **Step 2:** `pnpm --filter @dxos/scene exec vitest run --project=node src/element.test.ts` → FAIL.
- [ ] **Step 3:** Move the schemas. **Step 4:** PASS + scene and react-ui-canvas suites.
- [ ] **Step 5:** Commit `scene: the canvas element base, shared by both dimensions`.

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

- Produces: `SceneSvg` props `{ document: SceneDocument; layout: string }`; `renderSvg(doc, layout): Markup`, drawing
  composite parts through each instance's transform (`center + rotation·scale·local`, strokes and text scaled) and
  reading `Style2D` (diagram colours via decision 19's map).
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

### Task A.1: `Layout2D` carries the View: layers, lattice, constraints

**Files:** Modify `packages/common/scene/src/Scene.ts`; test `src/layout2d.test.ts`.

**Interfaces:**

- Produces: `Layout2D = { key; name?; model?; elements: Record<string, Element2D>; layers?; anonymous?; styles?;
lattice?: LatticeSpec; constraints?: Constraint[] }`; the elements store validates the base and
  preserves unknown fields (decision 13); `KindRegistry` validates each kind's own fields.
- **Parity:** `Layout3D` gets the same `layers`/`styles` fields; `lattice`/`constraints` are 2D.

- [ ] **Step 1: Failing tests** `test('a View copies into a Layout2D with only the decided renames', …)` (corpus,
      Task A.3); `test('an unknown kind keeps its fields', …)`; `test('the registry rejects a bad field of a registered
kind', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `scene: Layout2D carries the canvas View`.

### Task A.2: `Style2D`, `Style3D`, `StyleCatalog`, `resolveStyle`

**Files:**

- Create: `packages/common/scene/src/style.ts`, `src/style.test.ts`
- Modify: `src/Scene.ts` (remove the shared `Style`; `elementBase.style?: string (was `class`)`; `Element2D.overrides?:
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
  lattice/constraint/dynamic models; timelines are covered by A.5)
- Test: `packages/plugins/plugin-canvas/src/model/migrate-scenes.test.ts`

**Interfaces:**

- Consumes: 0.1 base, A.1 `Layout2D`, A.2 styles. Produces: `legacyDocument(content): SceneDocument` emitting the final shape
  (styles → `Model2D.styles`, `class` → `style`, own style → `overrides`).
- **Parity:** 2D-only (legacy data is 2D).

- [ ] **Step 1: Failing test** `test('every corpus record round-trips through Element2D with no field lost', …)`:
      legacy content → `legacyDocument` → back through the 2D viewport's read model (`toRenderList2D`, Task C.1) equals the
      original records field by field (deep equal after normalising `z`→`order`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** PASS + plugin-canvas suite.
- [ ] **Step 5:** Commit `plugin-canvas: scene/2 migrates straight to the final Element2D shape`.

---

### Task A.4: 3D adopts the canvas base (decision 12)

**Files:** `packages/common/scene/src/{Scene,intent,model-intent,clipboard,hierarchy,validate,arrange,echo}.ts`,
`packages/common/diagram/src/dsl/scene-model.ts` (reader/printer), the exemplars, react-ui-scene `three/*` and
`components/*`, plugin-canvas scene stages.

**Interfaces:** `Element3D = elementBase & { center?: Vec3; scale?: Vec3; rotation?: Vec3; points?: Vec3[];
overrides?: Partial<Style3D> }`; `kind`→`type`, `order`→`z`, `from`/`to`→`source`/`target` `{node, port}`;
groups → composites + `instance` (decision 17) with the shared instance transform (decision 18; 3D `scale: Vec3`):
remove `members`/`arrange`, move the ring/grid arrangers onto composites, and map the `.dx` group text onto
composites. No aliases.

- [ ] **Step 1: Failing tests** — every `.dx` exemplar round-trips with the new names (text unchanged);
      `test('a 3D link binds by source/target endpoints', …)`; `test('a 3D group is a composite placed by an instance',
…)`.
- [ ] **Steps 2–4:** FAIL → rename across the listed files → PASS (scene, diagram, react-ui-scene, plugin-canvas suites).
- [ ] **Step 5: Browser:** Scene3D story and SceneStage still render and animate. Commit `scene: 3D adopts the canvas
element base`.

### Task A.5: Canvas timelines become animator shots (decision 16)

**Files:** plugin-canvas `model/migrate-scenes.ts` (+test); plugin-animator `types/Animation.ts` (shot creation helper).

**Interfaces:** `migrateTimeline(view: View, scene: Scene2D): Animation.Shot` — copies the canvas `Timeline`
(`@dxos/animation`) into a shot staging the migrated scene, rewriting each track's target from node id + node path to
element id + element path (e.g. `style.opacity` → `overrides.opacity`); the migration adds the shot to the space.

- [ ] **Step 1: Failing test** `test('a canvas timeline migrates into a shot over the migrated scene with element
paths', …)` (track count, durations, keyframes equal; targets rewritten).
- [ ] **Steps 2–5:** FAIL → implement → PASS (plugin-canvas, plugin-animator suites) → commit `plugin-canvas: canvas
timelines migrate into animator shots`.

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
`CanvasCamera`, `CanvasDisplay`), `SceneContextMenu`.

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
  make object, edit parts; config extras e.g. import mesh), `LayersSection` (hide/lock on `elementBase.layer`),
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

### Task B.7: Shared Timeline panel (decision 16)

**Files:** Create `react-ui-canvas/src/editor/TimelinePanel.tsx` (+test); generalise plugin-animator's timeline
components where they exist rather than copying them.

**Interfaces:** `SceneEditor.Timeline` — lists the shots staging the open scene (query by `Shot.stage`), plays and
scrubs one (sampled through the dimension's stage, never written), keyframes the selected elements' animatable fields
and the camera into the shot's `Timeline`, and creates a shot when none exists.

- **Parity:** shared panel; sampling uses each dimension's existing animator stage (2D/3D).

- [ ] **Step 1: Failing tests** (happy-dom) `test('the panel lists the shots staging the open scene', …)`;
      `test('keyframing a selected element writes a track to the shot, not the layout', …)`; `test('with no shot,
keyframing creates one', …)`.
- [ ] **Steps 2–4:** FAIL → implement → PASS. **Step 5: Browser:** keyframe a 2D and a 3D element and play it in both
      SceneArticle stories. Commit `react-ui-canvas: shared Timeline panel over animator shots`.

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

- [x] Failing test `test('a move lands on whole lattice cells', …)` (port the existing lattice tests) → implement →
      PASS → commit `react-ui-canvas: lattice mode on Layout2D`.

### Task D.2: Constrained and dynamic

**Files:** Port `constrained.ts` and `dynamic.ts` (their models are `Layout2D.constraints` / `graph`, A.1).

- [x] Failing tests ported from `constrained.test.ts`/`dynamic.test.ts` (solver re-places after a move; renaming the
      layout keeps the model) → implement → PASS → commit `react-ui-canvas: constrained and dynamic modes on Layout2D`.
      Dynamic done (R-11); constrained wired through a `layout` intent that writes `Layout2D.constraints` in the same
      batch as the positions (R-15).

### Task D.3: Scored

**Files:** The scoring utilities read `RenderList2D`.

- [x] Failing test `test('the score over a Layout2D equals the score over the corpus', …)` → implement → PASS →
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

Delete react-ui-canvas `model/types.ts`'s `View`/`Node`/`Link`/`Intent`, `model/timeline.ts` (`sampleView`,
`sampleCamera`, the per-View timeline; decision 16), `model/store.ts` (`ViewStore`,
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
- Timeline — shots staging the open scene, keyframing, playback (2D and 3D).
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
   migration. Mitigation: with decision 12 the mapping is a copy plus two renames; 0.1's field-subset test and A.3's corpus round-trip pin it.
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
6. **Composite transform in rendering (Phase 0, decision 18):** drawing diagram objects through instance transforms
   instead of baked coordinates must keep the corpus metrics identical (strokes/text scale with the instance).
   Mitigation: 0.3's metric gate; one composite per object keeps ids stable.
7. **Existing `.dx.svg` files:** files exported before Phase 0 are not imported as editable drawings (user, 2026-10-30); they still display as images.
8. **Timeline migration (A.5):** canvas tracks target node paths; a missed path rewrite silently drops an animated
   property. Mitigation: A.5's test compares every track and keyframe after the rewrite.
9. **Scope:** Phase E (especially compute) is large; the plan keeps every phase green so the PR is shippable at the
   end of each phase.

## Relative size

| Phase                     | Tasks | Relative size                                                                 |
| ------------------------- | ----- | ----------------------------------------------------------------------------- |
| 0 — one DSL target        | 5     | L (engines' output stage, renderer, illustrator ops; corpus must stay stable) |
| A — data model            | 5     | M (mostly copy; A.4 renames 3D; A.5 migrates timelines)                       |
| B — editor core, 3D first | 7     | L (incl. the shared Timeline panel)                                           |
| C — 2D viewport           | 3     | L                                                                             |
| D — modes                 | 3     | M                                                                             |
| E — retire + consumers    | 6     | XL (compute board is the largest single task)                                 |
| F — review aids           | 3     | M                                                                             |
