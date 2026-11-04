# plugin-canvas — Design

Status: spec for review (2026-09-20, rev 8: open node types, port direction, free endpoints and markers (§4), toolbar, marquee modes, symmetric resize, ghost and palette drops (§8), e2e (§9); rev 7: text parts with in-place editing and node style (§4), grid-aligned portal frame and navigation shield (§5), always-on grid (§7); rev 6: typed nodes and links (§4, decision 9), palette and spline editing (§8), `MIGRATION.md`; rev 5: §4b layers and data structures as built, §9 synced; rev 4: §6b mobile
navigation mode; rev 3: §3b illustrator DSL reuse, PR 0). Inputs: `AUDIT.md` (existing surfaces), `RESEARCH.md` (external
landscape), and a throwaway spike (deleted once the engine's `Nested` story covered it; its findings are folded
into §5). Engine: `packages/ui/react-ui-canvas/src/` (`model`, `utils`, `hooks`, `components`; barrel `src/index.ts`; the 3D renderer at `./3d`), stories `ui/react-ui-canvas/...`; the editor application is `@dxos/react-ui-canvas-editor` (§9).

## 1. Goal

An infinite, zoomable canvas that represents diagrams at multiple depths. A **scene** is one level of detail; it
holds typed **nodes** (rectangles, ellipses, UML classes, text, ECHO object cards, portals to child scenes) joined by
typed **links** (lines, curves, splines). Zooming into a portal
drills to the child scene; zooming out returns to the parent. Cells host live HTML (editors, `Surface`s).

The canvas is a **set of layered systems**: the drawing model (what is true), a layout projection (where things
are), and the surface (how they are drawn and manipulated) are separate, so the same surface serves freehand
diagrams, constraint-driven diagrams, and diagrams projected from an external ECHO graph.

Non-goals for the prototype: freehand drawing, cross-scene links, multiplayer cursors, export formats.
The legacy canvas editor and `plugin-conductor` keep working untouched until the engine replaces them.

## 2. Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Rewrite** a new engine; do not adopt `@xyflow/react` or tldraw                                                                                                                                                                                                                                                                                                                                                                | xyflow has one viewport per instance, a 0.5–2× zoom design, flat nested divs with z-index bugs and one store per instance; tldraw's SDK license blocks production. See `AUDIT.md` §5.                                                      |
| 2   | Engine lives in **`packages/ui/react-ui-canvas/src/`** beside the archived canvas during development                                                                                                                                                                                                                                                                                                                            | It replaces the current `Canvas` eventually; a sibling folder keeps the old exports intact for canvas-editor/compute/sequencer until the switch.                                                                                           |
| 3   | **All type definitions local** to the package (Effect `Schema`, no ECHO `Type.makeObject` yet)                                                                                                                                                                                                                                                                                                                                  | `react-ui-canvas-editor/src/types/schema.ts` is replaced only once the prototype works; a plain schema wraps into an ECHO type without change.                                                                                             |
| 4   | **Depth = scene nesting**; within a scene one flat coordinate space                                                                                                                                                                                                                                                                                                                                                             | Containment is the hierarchy; grouping inside a scene is visual only.                                                                                                                                                                      |
| 5   | **Per-scene local coordinates**, doubles, unit = CSS px at zoom 1                                                                                                                                                                                                                                                                                                                                                               | A global `(x, y, depth)` compounds float32 error in the compositor after a few levels and couples separate documents.                                                                                                                      |
| 6   | **Scene bounds are derived** from content (union of node frames, padded, grown to the major grid), never stored                                                                                                                                                                                                                                                                                                                 | Muse "flex boards"; a portal maps the child's derived bounds into the cell.                                                                                                                                                                |
| 7   | **Rendering: DOM root** with the camera as one CSS transform; SVG as layers (links, overlay); canvas2d only for thumbnails. No third-party engine                                                                                                                                                                                                                                                                               | Cells host live React content; SVG `foreignObject` is unreliable; pixi/konva cannot host HTML.                                                                                                                                             |
| 8   | **d3 only as pure functions**: `interpolateZoom`, `d3-shape` curves                                                                                                                                                                                                                                                                                                                                                             | Native Pointer Events replace d3-zoom/d3-drag and keep React owning the DOM.                                                                                                                                                               |
| 9   | **Diagrams are typed nodes and typed links.** A node has a centre plus the properties its type needs (size, radii, compartments, ports); a link has typed endpoints `{node, port?}` and, for a spline, control points. Both carry a fractional `z`; ids share one namespace, so one selection, one undo log and one `update` intent cover both                                                                                  | Mirrors canvas-editor's `Polygon`/`Connection` split and compute's per-type `ShapeDef`s; a link is not a node with a special kind, so node-only operations (move, resize, ports) never have to filter links out. Decision 12 covers ports. |
| 10  | **Two live depths max** (root + one nested), further depths as previews                                                                                                                                                                                                                                                                                                                                                         | Bounded DOM; verified in the spike.                                                                                                                                                                                                        |
| 11  | **The surface never writes coordinates.** It applies edits (move, resize, link, create, delete) to its draw state, which reach the host as `LayoutIntent`s; the layout's mode (`constrain`) rewrites or refuses them                                                                                                                                                                                                            | This is what makes variants 1–3 share one surface.                                                                                                                                                                                         |
| 12  | **Ports come from the cell definition** (`CellDef.ports`), not from the data                                                                                                                                                                                                                                                                                                                                                    | Same as anchors in canvas-editor's `ShapeRegistry` and `Port {side, offset}` in react-ui-diagram; shape-specific, not per-instance.                                                                                                        |
| 13  | **The engine is a `Drawing` variant** (`schema 'dxos.org/scene/1'`); illustrator's scene DSL commands are the write API behind the projection seam; the headless model is extracted to `@dxos/diagram` first                                                                                                                                                                                                                    | §3b: the ECHO envelope, agent operations, dialects and layout engines already exist; a UI package cannot depend on a plugin.                                                                                                               |
| 14  | **Mobile navigation mode: the same scene rendered as columns.** On narrow or touch-only viewports the view switches from the 2D camera to a horizontal sequence of full-height **columns**, one per _aspect_ of the current scene, navigated by swipe, tabs or the breadcrumb; each column scrolls vertically. Aspects are read-only projections of the positioned `Scene`, so the model, projections and intents are unchanged | A 2D infinite canvas is unusable at phone width (pinch precision, no hover, no wheel, no keyboard); a linear column per aspect is how Composer already presents planks on mobile. §6b.                                                     |

## 3. Layered architecture

```
 drawing model (source of truth)      mode (layout rule)                  surface (render + interact)
 ┌──────────────────────────┐        ┌──────────────────────────┐        ┌──────────────────────────┐
 │ 1 freehand: View nodes   │──id──▶ │ positioned View          │──atom─▶│ Canvas / SceneLayer   │
 │   with center/size       │◀─set── │                          │◀intent─│ control frame, ports,    │
 ├──────────────────────────┤        ├──────────────────────────┤        │ camera, selection, tools │
 │ 2 constrained: DSL       │──solve▶│ positioned View          │──atom─▶│                          │
 │   (commands/constraints) │◀rewrite│                          │◀intent─│                          │
 ├──────────────────────────┤        ├──────────────────────────┤        │                          │
 │ 3 dynamic: ECHO graph    │─layout▶│ positioned View          │──atom─▶│                          │
 │   + optional overrides   │◀overr.─│ (engine + overrides)     │◀intent─│                          │
 └──────────────────────────┘        └──────────────────────────┘        └──────────────────────────┘
```

**The mode seam** (what the surface knows of a layout's rules): `type:DrawScene` and the operations in `SPEC-2D.mdl`.
The surface draws the document's render lists, edits them in memory, and hands the result to the host as
`LayoutIntent`s through the host's `constrain` rule; the variants differ only in what that rule makes of an edit.

| Variant           | Model                                                                                                                   | `project`                                                                                                                                                                 | `apply(move A by Δ)`                                                                                                                                                     | Existing pieces to reuse                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **1 freehand**    | `View` with stored `center/size` (tldraw-like)                                                                          | identity                                                                                                                                                                  | writes `center`                                                                                                                                                          | the spike                                                                               |
| **2 constrained** | a DSL: `plugin-illustrator` `Scene.Command`s, or cardinal constraints (`A east of B`, `A aligned with B`, `A inside G`) | a solver (cardinal constraints → longest-path ranks per axis, then packing); or a dialect's `compile`                                                                     | classifies the drop against neighbours and **rewrites the constraint** (A dragged left of B → `A west of B`), then re-solves; ambiguous drops are rejected and snap back | illustrator `dialect.ts`, `layout.ts` (`rank`), `uml-grid.ts`, `ortho-router.ts`        |
| **3 dynamic**     | an external ECHO graph (objects + relations)                                                                            | a layout engine (illustrator `Layout.rank`, dagre, ELK) produces cells and links; an `Overlay {positions, collapsed, labels}` (react-ui-diagram's pattern) applies on top | fixed layout: reject; hybrid: write an override into the `Overlay`; graph edits re-run the engine and overrides that still resolve survive                               | react-ui-diagram `types/diagram.ts` (`Overlay`), `model/layout.ts`; illustrator engines |

Variant 2 needs a **relative coordinate system** in the DSL: constraints are expressed in a named frame
(`grid`, `lanes`, `radial` later). The solver for the prototype is deliberately small: cardinal relations only,
one rank pass per axis, equal cell sizes, snapped to the grid.

Mixed Views are allowed (a freehand View containing a `view` node onto a dynamic View is supported, since the
mode is per layout).

## 3b. Reusing plugin-illustrator's DSL mechanism

`plugin-illustrator` already implements the layered split in §3 for third-party canvases. Its layers, and what
each one gives the new engine:

| Illustrator layer                                                                                                                                   | What it is                                                                                                                                                                                                                                                                                                  | Use in the new canvas                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/Drawing.ts`                                                                                                                                  | `Drawing {name, canvas: Ref(Canvas)}`; `Canvas {schema, content: Record<id, any>}`, a hidden, opaque, CRDT-merged record map claimed by a renderer via `schema`                                                                                                                                             | **The Scene ECHO type.** A scene _is_ a `Canvas` with `schema = 'dxos.org/scene/1'` whose `content` is the cell map (§4). No new ECHO type; name, graph node, create flow, card/article scaffolding and the shared selection model come from the plugin. A portal references a `Drawing` (`Ref`), so nested scenes are first-class documents and Muse "linked cards" are just two portals to one drawing.                                 |
| `model/scene.ts`                                                                                                                                    | Renderer-neutral DSL: `WorldObject {id, origin, scale, ref, elements}` in object-local units; elements rect/ellipse/diamond/triangle/circle/line/curve/arc/text/arrow; `Arrow {from, to}` bound to `"object/element"` refs; edit `Command`s (`upsert-object`, `upsert-elements`, `remove-*`, `move-object`) | **The write language behind the projection seam.** Intents compile to commands: move → `move-object`, create → `upsert-object`, delete → `remove-object`, link → `upsert-elements` with an `arrow`, resize → `upsert-elements` with the resized box. Bound arrow endpoints that "track their target" are the automatic links of §4.                                                                                                       |
| `model/content.ts`                                                                                                                                  | `ContentHandler {identify, render, read, translate, scaffold?, merge?, prune?}` + `applyCommands(content, commands, handler)`: command semantics over any record map, identity stamped per record                                                                                                           | **`SceneHandler`**: identity = `{object: cell.group ?? cell.id, element: cell.id}`; `render` compiles an object's elements into cells (box → rect/text, text → text, arrow → link, `ref` → object cell) with the placement folded into cell centres and a `group` tag; `read` rebuilds world objects from the tag with origin = bbox top-left; `translate` shifts centres. `svg-handler.ts` (DSL as persistence) is the closest template. |
| `model/builder.ts`                                                                                                                                  | `makeBuilder({schema, handler})` → `{read(canvas), apply(canvas, commands)}` under `Obj.update`                                                                                                                                                                                                             | The phase 3 ECHO store: `CanvasBuilder = makeBuilder({schema: 'dxos.org/scene/1', handler: SceneHandler})`. The only file in `model/` that imports `@dxos/echo`.                                                                                                                                                                                                                                                                          |
| `model/dialect.ts`                                                                                                                                  | `Dialect {id, input, compile → Command[]}` + registry; mermaid, UML class, UML grid and MOSAIC UI dialects own their layout                                                                                                                                                                                 | **Variant 2 (constrained)** is a dialect whose input is the constraint DSL; a `move` intent rewrites the source and recompiles. **Variant 3 (dynamic)** is a dialect whose input is an ECHO graph query. Every existing dialect renders on the new canvas the moment `SceneHandler` exists, and so do the agent operations `DrawingOperation.Edit/Generate`.                                                                              |
| `model/layout.ts`, `uml-grid.ts`, `ortho-router.ts`, `uml-rules.ts`, `uml-search.ts`, `uml-engine.ts` (dagre/ELK), `objective.ts`, `diagnostics.ts` | Ranking, uniform-cell grids with ports/channels, A* orthogonal routing, rule-based grouping, scored search, engine adapters, constraint/cost objective                                                                                                                                                      | The layout engines for variants 2 and 3, and the `ortho` link route of §7. Illustrator's ports (`uml-grid` spreads terminals along a side) are the same idea as `Port {side, offset}`.                                                                                                                                                                                                                                                    |
| `types/IllustratorCapabilities.ts`                                                                                                                  | `VariantProvider {id, builder, card, article, createCanvas}`; surface props carry `selection` / `onSelectionChange` / `onActivate` in scene object ids                                                                                                                                                      | `plugin-canvas` contributes one `DrawingVariant`; the host owns selection and activation, which matches the per-view atoms in §4.                                                                                                                                                                                                                                                                                                         |

Hybrid overrides in variant 3 need no new mechanism: `upsert-object` without `origin` keeps the previous placement
("omit on upsert to keep the current position"), so re-compiling a dynamic scene preserves user-moved objects and
`remove-object` drops the ones whose graph nodes vanished.

**Gaps in the DSL** (all additive, each a one-field change):

1. Arrow endpoints have no port: allow `"object/element#port"` in `from`/`to` (or `fromPort`/`toPort`), automatic when absent.
2. No portal element: add `{kind: 'portal', id, x, y, w, h, ref}` (ref = a `Drawing` DXN), or a `WorldObject.kind: 'scene'` with `ref`.
3. Z-order is insertion order (`order` in the SVG handler): add an optional fractional `index` on `WorldObject`.
4. `ref` is a plain string; fine for a DXN, but the scene handler resolves it to `Ref` on the object cell.

**Factoring options:**

|     | Option                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Consequence                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **Extract the headless model into `packages/common/diagram` (`@dxos/diagram`)**: `scene`, `content`, `dialect`, `layout`, `uml*`, `mermaid*`, `ui`, `ortho-router`, `objective`, `diagnostics`, `svg-handler` and their tests (deps: `effect`, `@dxos/invariant`, `@dxos/util` only). `builder.ts`, `Drawing.ts`, capabilities and operations stay in the plugin. Update the 14 external `plugin-illustrator/model` import sites (tldraw, excalidraw, markdown, stack, debug, onboarding, assistant-evals, stories-assistant); no compat re-exports. | `react-ui-canvas` can depend on it, so the constrained and dynamic stories use the real dialects and engines. Mechanical move, ~6.5k lines incl. tests, one PR before phase 1. `react-ui-diagram`'s duplicate mermaid projector folds in later. |
| B   | Keep everything in the plugin; the engine declares a structurally identical `ContentHandler` type and `plugin-canvas` does the wiring.                                                                                                                                                                                                                                                                                                                                                                                                               | Zero extraction, but the phase 1 stories would need copies of `rank`/routing and the dialects cannot be exercised in storybook.                                                                                                                 |
| C   | Extract only `scene` + `content` + `dialect` + `layout.rank` now (~600 lines), engines later.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Cheapest first step; a second move for the engines.                                                                                                                                                                                             |

Recommendation: **A**, as "PR 0" of this project. It costs one mechanical PR and removes the copy of `rank`
planned in §9; the `projections/*` modules become thin dialect wrappers. Decision 13 below records it.

## 4. Data model

The authoritative model — the Ontology (View, Object, Instance, Tag), the types and the intents — is
`SPEC.mdl` (`org.dxos.ui.react-ui-canvas`). This section keeps the reasoning behind the node, link and port
types; `VIEWS.md` keeps the reasoning behind the containers.

- **Open node types** (decision 1, M1): the engine works on `NodeBase` (every node has a centre and a size, so
  placing, hit testing, ports and routes need no registry) and narrows to its built-ins with guards
  (`isRectNode`, …). A host registers its own types with their schema, view, `create` and ports, and builds its
  View schema with `createViewSchema(defs.map((def) => def.schema))`, so validation stays exact per type; the
  palette groups types by `NodeDef.group`. A type the registry does not know renders as a frame with its name.
- **Port direction** (decision 2): `Port.accepts` (`in`, `out`, default either) filters `pairPorts` and the drop
  target (a link leaves an `out` port and lands on an `in` port; a node with no acceptable port takes no drop),
  and a link created between ports that declare a direction gets an arrow at its end (`ends: { end: 'arrow' }`).
- **Free endpoints and markers** (decision 3, M2): an end may be a scene `point` instead of a node, so a link can
  be a standalone arrow or path. A node end facing a free point takes its port nearest that point; two free ends
  face each other. A link tool dragged on empty canvas draws a free-ended link (attaching whichever end lands on
  a node), and dragging a link end onto empty canvas frees it. `ends` names the marker at each end (`arrow`,
  `circle`, `triangle`); the layer defines one marker set in nominal units.
- `shapes.ts` is the pure geometry of the types: `nodeBounds(node)` (the box, or the radii for an ellipse),
  `resizeNode(node, bounds)` (writes `size` or `rx`/`ry`), `createNode(type, …)` / `createLink(type, …)` defaults.
  The registry only renders and declares ports and flags; the projection never depends on it.
- `contentBounds(scene)` is derived: union of node frames plus padding, grown to the major grid; an empty scene
  has none. Fit frames it; nothing draws it.
- **Derived properties**: an ECHO-object node's displayed props (label, icon, colour, summary, ports) come from a
  `projector(obj) → NodeProps` chosen by the object's type, merged under `node.overrides`. Rendering goes through
  `Surface` so plugins own the card body; the projector only supplies what the frame and ports need.
- **Text parts** (`parts.ts`): a node type renders its text through `TextPart`s named by the property they edit
  (`label`, `text`, `name`, `attributes`, `methods`; a UML class has three). Double-clicking a part opens an
  in-place `react-ui-editor` over the same box: Enter commits (in a multi-line part Enter breaks the line and
  Mod-Enter commits), Escape rejects, leaving the editor commits; a commit is one `update` intent, a list part
  writing one entry per line. The editor keeps pointer and key events to itself, so no drag or shortcut fires
  while typing. Which part was hit is asked of the DOM (`data-part`), the node comes from the model, so a part of
  a nested live scene never matches the portal over it.
- **Style** (`style.ts`): `NodeStyle` picks a theme hue (fill `bg-<hue>-surface`, text `text-<hue>-fg`, border
  `border-<hue>-border`), and toggles rounded corners, fill and border; `guide` draws the frame dashed and
  unfilled (an annotation), `className` appends a host's own classes. The frame resolves the classes, the views
  draw no background of their own. The properties panel renders it as a group with the hue picker.
- **Ports** come from the node's own `ports` when it carries them (how compute nodes with schema-derived
  inputs/outputs will express them, see `MIGRATION.md`), else the type's `NodeDef.ports(node)`, else
  `portsPerSide` (default 3) ports spread along each side, named `<side><index>` (`e2` is the east centre) and
  listed centre-first so automatic links prefer the centre. A port is drawn at the major grid line nearest its
  offset, kept within its side; ports that land on one point collapse to the first, so a small node keeps fewer.
  The ellipse declares one port per side: only the frame's side centres lie on the curve.
- **Automatic links**: when either endpoint has no `port`, the router picks the port pair with the shortest
  distance; it is recomputed whenever the projection re-emits, so re-arranging the diagram re-attaches links. A
  user who drags a link end onto a specific port pins it (`port` set); dragging it onto the node body unpins it.
- **Link routes** by type (`route.ts`): `line` straight, `curve` cubic leaving each port along its normal, `spline`
  the polyline through `[source, ...points, target]` with each interior point rounded by a quadratic whose
  control it is, so the route bends around a control point rather than through it and the radius shrinks on a
  short segment; `ortho` (phase 2) from `@dxos/diagram`'s router. A selected spline shows its control points as
  diamond handles and the midpoint of every span as a dot: drag a diamond to move a point, drag a dot to add
  one there and move it in the same gesture, double-click on the spline inserts one at the nearest segment,
  alt-click removes one; each is an `update` of `points`.
- A View opened by two `view` nodes is a Muse "linked card"; nothing forbids it.
- Ephemeral state (selection, hover, drag offset, camera, View path, tool, last link type) lives in per-view
  atoms, never in the model.

## 4b. Layers and data structures as built

Four layers, each one an Effect atom the next one subscribes to; nothing below a layer knows what is above it. The
host owns the document and its history; the engine owns only what it draws.

```
 document (host)        draw state (engine)      view state                surface
 ┌─────────────────┐    ┌────────────────────┐   ┌───────────────────────┐ ┌──────────────────────────────┐
 │ SceneDocument   │─▶  │ DrawState          │   │ CanvasAtoms           │ │ Canvas.Root / Viewport       │
 │  layouts        │read│  views: Atom<Map>  │──▶│  camera, path,        │▶│  grid ▸ SceneLayer ▸ overlay │
 │                 │    │  view(id)          │◀──│  selection, hover,    │ │  pointer machine, keys       │
 │                 │◀───│ DrawScene          │   │  tool, snap, drag     │ │  ControlFrame, PartEditor    │
 └─────────────────┘ LayoutIntent apply(SceneEdit)└───────────────────────┘ └──────────────────────────────┘
  via constrain       (per view, never stored)    (per view, never stored)  (React; reads atoms, applies edits)
```

| Layer          | Owns                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**   | The `SceneDocument` the host passes `Canvas.Root`. The engine never writes it: a gesture's result leaves as one `LayoutIntent` per changed layout (`layoutWrites`, `applyLayoutWrites`) after the host's `constrain` rule.                |
| **Draw state** | Every render list (`RenderList2D`: a View or Object definition) of the document, by id (`engine/draw-state.ts`), read before paint (`toRenderLists2D`). Edits go through `DrawScene.apply(edit)`, a pure `SceneEdit` (`utils/edits.ts`).  |
| **View state** | Everything ephemeral for one view (`engine/atoms.ts`): the camera, the scene path (breadcrumbs), selection, hover, the active tool, the grid/snap toggle and the in-flight drag. Optionally owned by the host, so two views can share it. |
| **Surface**    | Rendering and gestures (`components/Canvas`, `SceneLayer`, `ControlFrame`). `Canvas.Root` reads the atoms, runs the pointer state machine and key handling, and applies edits; `SceneLayer` renders one list under one CSS transform.     |

The model on the wire between the layers is the render list (SPEC-2D.mdl `type:View`, `RenderList2D` in code): `{ id, name?, nodes, links, … }` with typed `Node`s (centre plus per-type properties) and typed `Link`s (endpoints plus, for a spline, control points), every element carrying `{ id, type, z, locked? }`. Scene bounds, hit tests, port positions and link routes are all derived from it (`hit.ts`, `ports.ts`, `route.ts`, `camera.ts`) and never stored; `order.ts` supplies the fractional `z` keys.

Data flow for one gesture: pointer-down hit-tests the positioned scene in scene coordinates → the surface writes a `Drag` atom → each move updates the drag's transient geometry (snapped for a node gesture; a link band follows the pointer and snaps on release) and the surface previews the gesture's `SceneEdit` through the layout's mode (`DrawScene.constrain`) → pointer-up applies the edit to the draw state → the change leaves as `LayoutIntent`s through the host's `constrain`, which stores, rewrites or refuses it → the host's document change is read back into the draw state → the surface re-renders. The undo unit is the committed edit (SPEC.mdl [F-4.1]).

## 4c. Prototypes (designed 2026-10-07; type prototypes built)

Shapes that look and behave alike should share one definition and differ only where they say so. There is
one rule, applied at two levels: **a value left unset is taken from the prototype, recursively.**

**Type prototypes (built).** A node type may be declared on a prototype: `NodeDefSpec = Partial<NodeDef> &
{ extends?: string }`. `createNodeRegistry(types, prototypes)` resolves each type once, its own fields over
its prototype chain's, and throws on an unknown prototype, a cycle, or a type left without a required field
(`name`, `icon`, `schema`, `component`, `create`, `defaultSize`). A prototype is not a type: it is not in the
registry, the palette or the scene schema, so lookups stay one record read. Schemas compose the same way by
spreading the prototype's field set (`boxFields`) into each type's struct.

| Prototype / type | Declares                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `box`            | A framed shape with a centred, editable `label`: `BoxNodeView`, resizable, 256x256, ports along every side.                            |
| `rect`           | `extends: 'box'`; name, icon, schema, `create`. Nothing of its own look.                                                               |
| `frame`          | `extends: 'box'`; its schema adds `scene` and `link.contents`, its view adds the child scene and an open control, `openable`, 512x256. |

The frame is a box: a centred label, the type's ports, and a zoom-in control (react-ui `Button`,
top-right) that drills in like a double-click. `link.contents` chooses the body: the child scene (preview, then
live, decision 10) or the label. Unset, it shows the child while there is no label, so an unnamed frame
still reads as its contents and naming one turns it into a plain box. A host may give a frame other content
(plugin-canvas: a referenced ECHO object, `link.object`, as a `Surface`) by replacing its component; `NodeDef.hostOpen`
then lets the host open such a node itself, and auto-drill passes it by.

**Instance prototypes (designed, not built; TASKS "Object classes and prototypes").** A node may name a
prototype node: `prototype?: NodeId` (same scene first; a canvas-level class library later). Its unset
properties resolve from the prototype's at read time — `resolveNode(scene, node)`, cycle-guarded, before
rendering, hit-testing and the properties form — so editing the prototype restyles every node built on it.
The resolution is shallow per field (`style` merges per key); identity, place, text parts and the child
scene are never inherited (`cloneShape`'s `OWN_FIELDS`). The properties form shows an inherited value as
the field's placeholder and a "reset to prototype" action clears an override, reusing the multi-select
indeterminate machinery. Applying a prototype once without the link is `cloneShape`; detaching copies the
resolved values in.

## 5. Coordinate system and camera

- A view has a **scene path** (breadcrumbs) and a **camera** for the current root scene, zoom bounded to
  `[1/32, 32]`.
- **True scale**: every scene keeps its own coordinates, and zoom is always against them, so at 100%
  (`NOMINAL_ZOOM`) a shape of a given size is the same number of screen px at any level. Fit (Home) frames the
  scene's content but never zooms past 100%; Actual size (Shift+0) returns to 100% about the view's centre.
- **Portal frame**: the child-space region that maps onto the portal, `portalFrame(portal, contentBounds(child))`:
  the child's content centred in the smallest region of the portal's proportions that holds it, never smaller than
  the portal's own box (an empty child is that box about its origin). It only places the child under the portal:
  the preview shrinks a large child to fit but never magnifies a small one, and entering maps the camera through
  it, so the zoom continues unchanged into the child's own scale. It is held for the visit, so editing inside does
  not move the child under the user, and is never drawn. Child point `q` maps to parent point
  `portal.origin + (q - frame.origin) * s` with `s = portalScale(portal, frame) ≤ 1`.
- **While the camera moves on its own** (wheel zoom or pan, an animation) the canvas ignores the pointer: a shield
  takes presses and hover is cleared, since nothing under the pointer is where it will be.
- **Drill-in** = animate the camera to fit the portal (`interpolateZoom`, 250–800 ms), stopping where the child
  would pass 1:1 so its text lands at natural size rather than magnified to fill the view, then swap the root scene
  and re-express the camera in child space (`enterPortal`); **drill-out** is the inverse (`exitPortal`) followed
  by a fit of the parent. Both verified seamless in the spike.
- **Auto drill**: after a zoom gesture settles (150 ms), a portal covering ≥ 85% of the viewport becomes the root;
  a root covering < 30% of what it covered on arrival (the history entry for the path) yields to its parent, so a
  child capped at 1:1, or a frame that shrinks as its first node is drawn, is never thrown out on arrival. The
  swap preserves coverage, so the two rules cannot oscillate.
- **Tiers** for a portal showing its contents, by on-screen size (`min(size) × composed zoom`): `< 40px` its title alone, as a closed scene,
  else the live child scene while `depth < liveDepth`, and past it a title + node count (later: a rasterised
  thumbnail). Hysteresis of ±10% at the tile boundary.

## 6. Navigation

| Gesture                                                                               | Effect                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Double-click a portal, or Enter with a portal selected                                | Animated drill-in                                                              |
| Pinch/ctrl+wheel until a portal fills the view                                        | Auto drill-in (no animation, camera preserved)                                 |
| Escape, breadcrumb click, "Up", or zooming the root below 30% of its arrival coverage | Drill-out (breadcrumb jumps several levels)                                    |
| Alt+← / Alt+→                                                                         | Back / forward through a history of `{path, camera}` entries                   |
| Shift+1 / Shift+2 / Shift+0                                                           | Fit scene / fit selection / reset zoom                                         |
| Double-click a text part of a node                                                    | Edits it in place (§4 text parts); other openable nodes open (the ECHO object) |
| URL / deep link (phase 3)                                                             | `{path, camera}` serialised so a location inside a nested scene is shareable   |

## 6b. Mobile navigation mode

_Written before decision 9 renamed cells: "cell" below means a node, and the `cells:`/`cell:` aspect names stay as spelled._

The 2D camera is replaced, not shrunk. Below the `md` breakpoint or when the primary input is coarse
(`(pointer: coarse) and (hover: none)`), and always when the host asks for it (`mode='columns'`), `Canvas`
renders the current scene as **columns**: a horizontally paged strip of full-height panels, one per **aspect**.
The `columns` mode reads the same render list from the same draw state; it adds no model state.

**Aspect** = a named, ordered, read-only projection of one scene into a vertical list. **Reading order** is the
key `(row, x, index, id)`, where `row` is the cell centre's y snapped to the grid, so cells on one line read
left to right and exact ties fall back to the fractional `index`, then the id: total and deterministic. The
engine ships these aspects and a `CellDef` may contribute more (`CellDef.aspects?: (cell) => Aspect[]`):

| Aspect         | Column contents                                                                                                                           | Order                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `overview`     | every placed cell as a row (kind icon, label, summary); portals are rows that open the child scene as the next column                     | layout order: top-to-bottom, then left-to-right by cell centre, so a diagram reads the way it is drawn |
| `cells:<kind>` | one column per cell kind present in the scene (rects, text, objects, portals)                                                             | same                                                                                                   |
| `links`        | every link as `source → target` with its label; tapping either end selects that cell and scrolls `overview` to it                         | by source row, then target row                                                                         |
| `cell:<id>`    | the selected cell in detail: its full content (`Surface` for object cells, the editor for text), its ports, and its links grouped by port | pushed when a row is tapped; one per selected cell                                                     |
| `scene:<path>` | a nested scene, i.e. the `overview` of the child, reached from a portal row                                                               | pushed on drill-in                                                                                     |

Aspects form a **strip** `Aspect[]`; the view keeps `{path, strip, column}` in the per-view atoms next to the
2D `{path, camera}` and both survive a mode switch, so rotating a phone or docking a tablet keeps the place the
user was reading. The switch goes through one **anchor**, `{path, cellId?}`, computed deterministically:

| From                              | Anchor                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2D camera                         | `path` = the 2D scene path; `cellId` = the first fully visible cell in reading order, else the cell nearest the viewport centre, else none (empty scene) |
| `overview`, `cells:<kind>` column | `path` = the column's scene; `cellId` = the first fully visible row, else the row nearest the column's vertical centre                                   |
| `links` column                    | as above, taking the **source** cell of that row                                                                                                         |
| `cell:<id>` column                | `path` = the scene that owns the cell; `cellId` = `id`                                                                                                   |
| `scene:<path>` column             | `path` = that nested path; `cellId` from its `overview` rows as above                                                                                    |

Restoring: **anchor → 2D** sets the path and fits the camera on the cell (fit scene when `cellId` is absent);
**anchor → columns** sets the strip to the breadcrumb's `scene:` columns for `path` (root first) followed by
that scene's `overview`, with the last column current and scrolled so the anchor row is the first fully visible
one. Pushed `cell:` and `links` columns are not restored: a switch always lands on `overview`. "First fully
visible" is the one rule everywhere; the fallbacks make the anchor total, so `2D → columns → 2D` fits the same
cell and `columns → 2D → columns` scrolls to the same row.

Navigation:

| Gesture                                                               | Effect                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horizontal swipe, or the tab bar above the strip                      | Previous / next column in the strip                                                                                                                                                                                                                                                                           |
| Tap a row                                                             | Push a `cell:<id>` column after the current one and page to it; selection follows                                                                                                                                                                                                                             |
| Tap a portal row, or the "open" affordance on a `scene` row           | Drill-in: push `scene:<path>` (its `overview`); the breadcrumb grows                                                                                                                                                                                                                                          |
| Back (swipe from the edge, breadcrumb tap, hardware back via history) | Pop the pushed columns to that point; drill-out is popping past a `scene:` column                                                                                                                                                                                                                             |
| Long-press a row                                                      | Context menu: open, select, delete (the same intents as §8)                                                                                                                                                                                                                                                   |
| Reorder rows by drag (`overview` and `cells:` only)                   | A `move` intent to the **insertion slot**: y = the neighbour's y and x = the neighbour's x ∓ one grid unit (before / after), so the cell's reading-order key `(y, x)` lands between the rows it was dropped between even when they share a y; the projection decides what it means, exactly as on the 2D view |

Editing on mobile is deliberately thin in phase 2: create (palette in the column header: rect, text, scene),
delete, rename, reorder; linking, resizing and free placement stay 2D. The intents are the same, so the
constrained and dynamic projections need nothing extra.

Rendering: one `div` per column with `scroll-snap-type: x mandatory` on the strip and `overflow-y: auto` per
column, `contain: strict`; rows are the cell's `CellDef.component` in a `compact` variant (a prop, not a second
component) so an object cell shows the same `Surface` in both modes. No grid, no overlay SVG, no camera atom
subscribers are mounted in this mode.

## 7. Rendering

Root `div` with `contain: strict`, `touch-none`, focusable. Layers, bottom to top:

1. **Grid**: the existing multi-resolution SVG `GridComponent` fed `{scale: zoom, offset: camera × zoom}`,
   always shown. It draws a minor grid (`DEFAULT_GRID`, 16 px at zoom 1), a major grid every
   `MAJOR_GRID_RATIO` (4) minor lines, plus levels a fourfold apart below and above (a quarter cell up to 64
   major cells), drawing every level whose cells are between 6 and 2048 screen px. A line's opacity comes from
   its on-screen spacing alone (a step darker per fourfold), so a level fades in as the view zooms rather than
   popping, and drilling through a grid-aligned portal (a quarter scale) draws the same lines at the same weight
   on both sides of the swap: the major grid is preserved across levels. `g` and the Snap button toggle snapping only. **Creation snaps to the major grid**
   (`MAJOR_GRID`, 64 scene px), the derived scene bounds grow outward to it, and the fixture and the solver /
   layout defaults (pitch, size, origin) are multiples of it, so an untouched layout is already snapped and the
   frame sits on lines. **Moving and resizing snap to the major grid** too (a drag lands the pressed node's
   top-left on it, a resize handle its moving edge), so a node's edges stay on major lines. A spline's control
   point, an arrow nudge (shift nudges by a major cell) and a palette drop land on the minor grid. Ports are exempt: each sits exactly at its offset along its side, so a short side still
   spreads them.
2. **Scene layer**: one `div` whose transform is `scale(zoom) translate(x, y)`, set **imperatively from the
   camera atom** (no React re-render on pan/zoom). Inside, one `div` per placed cell positioned at its bounds, and
   one `svg` (overflow visible) per scene holding link paths in scene coordinates. Portals in the live tier mount
   a nested scene layer with the portal transform, read-only.
3. **Overlay**: an `svg` sharing the camera transform for the **control frame** (selection outline, eight resize
   handles, ports), marquee, snap lines and the in-progress link rubber band; rendered by React from the atoms.

Cells choose an HTML container (rect, text, object) or SVG content (future shapes). Stroke widths and handle
sizes are compensated by zoom because CSS transforms on a parent div defeat `vector-effect`. Link routes:
`curve` via `d3-shape` link curves from port tangents; `ortho` via a port of illustrator's `ortho-router` (phase 2).

## 8. Interaction

Pointer Events state machine. The tool is `{kind: 'select'}`, `{kind: 'hand'}`, `{kind: 'node', type}` or `{kind: 'link', type}`.

| Gesture                    | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wheel                      | Up and down zoom about the cursor; a sideways scroll or shift+wheel pans. Ctrl/cmd+wheel (trackpad pinch) also zooms about the cursor. Touch pinch zooms about the midpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Space+drag, hand tool      | Pan. Drag on background in `select` = marquee (intersection); shift adds, alt subtracts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Click / shift-click        | Select / toggle; cmd+A selects all. Hit testing from the model in scene coordinates, never `getClientRects`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Drag selected nodes        | Transient offset atom, snapped in scene coordinates; on pointer-up one `move` intent (the undo unit). The projection decides what that means (§3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Control frame**          | Shown for the selection: outline, eight resize handles (`resize` intent through `resize.ts`: the moving edge snaps, `minSize` / `maxSize` clamp, shift keeps the centre; handles draw above ports so a handle wins at a side centre). Ports stay out of the way: they show on the hovered node, on the node under a link drag, and on every node with a link tool. Hover is a model hit test with a port-sized margin, not the node element's enter/leave, so it survives the pointer crossing onto a port on the frame edge; the hovered frame shows a faint border and selected nodes paint above their neighbours (paint order only, `z` is untouched).                                                        |
| Drag from a port           | Rubber band; drop on a node pins the target to the port nearest the pointer (the candidate port fills while hovering; ports also fill on hover as drag sources), drop on empty canvas creates a copy of the source shape (type, size, style, port count; not its text, identity or child scene) and links to it. The link's type is the active link tool's, or the last one picked under `select`. Emits a `link` intent carrying the whole link.                                                                                                                                                                                                                                                                 |
| Drag a link end            | Re-attach; onto a port pins, onto a body unpins, onto empty canvas frees the end at that (snapped) point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Link tool on empty canvas  | Draws a free-ended link from the press to the release, previewed as it will land; an end that reaches a node attaches there. A click without a drag draws nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Palette                    | Two groups generated from the registries: node types (R rectangle, E ellipse, C class, T text, S scene) and link types (L line, K curve, P spline). A node tool then click or drag on the canvas emits `create` (a click places the type's default size at the click); while drawing, the type's own view shows as a translucent ghost of the node that will land. A node entry can also be dragged onto the canvas (pragmatic-dnd; any source carrying `nodeDragData(type)` drops the same way), previewed by the same ghost. A link tool shows every port; dragging one creates that type.                                                                                                                      |
| Toolbar                    | Optional `Toolbar` component (decision 5) over actions the view exposes: Up / breadcrumbs, Fit, zoom in / out, Snap, Undo / Redo, Cut / Copy / Paste / Delete, a Create menu (a default-sized node at the centre of the view), Layout (disabled until a projection offers it, M4), Debug, and a zoom / pointer / depth readout. `showToolbar={false}` hides it; a host may render its own over the same actions.                                                                                                                                                                                                                                                                                                  |
| Read-only                  | `readonly` on `Canvas` replaces the projection's capabilities with none: selection, hover, pan, zoom and drill still work, but no handle, port, palette tool, toolbar edit, key or in-place editor reaches the model, and `Properties readonly` shows the fields without letting them change. The `Readonly` story is the fixture.                                                                                                                                                                                                                                                                                                                                                                                |
| Click a link / its handles | Links are selectable (a wide transparent twin of the stroke takes the press) and deletable. A selected link shows its two end handles: dragging one re-attaches that end: over a node the link is drawn re-attached to the port nearest the pointer, over free space it is drawn free-ended at the pointer, and dropping writes whichever it shows. A selected spline also shows diamond handles on its control points: click selects one (Delete or the right-click menu's "Remove control point" removes it), drag moves it, double-click on the stroke inserts one at the nearest segment, alt-click removes; all `update` intents. A spline leaves and enters its ports along the side normals, like a curve. |
| Keys                       | One table, `model/keys.ts`: every chord is a `KeyBinding` under a `KeyAction`, the view maps the action to what it means in the current state, and the toolbar prints its labels from the same table. Arrows nudge (shift ×4), Delete, Escape, Home (fit), G (snap), D (debug: every frame labelled with id, type, geometry and z), navigation keys from §6; tool letters stay on the registry entries. Attention scoping is the host's (M4).                                                                                                                                                                                                                                                                     |
| External drag-in           | pragmatic-dnd drop target on the root (`utils/dnd.ts`); internal gestures are pointer-driven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Cut / copy / paste         | Per-view clipboard (`clipboard.ts`) of the selected nodes and the links between them. Paste mints fresh ids, rewires the links, offsets one grid step further per paste (or lands at the pointer from the canvas menu) and applies as one `batch` intent, so it is one undo step. ⌘X / ⌘C / ⌘V, toolbar buttons, and a right-click menu: Cut / Copy / Delete on an element, Paste on the canvas, Remove control point on a spline point.                                                                                                                                                                                                                                                                          |
| Undo                       | Per-view log of projection snapshots (`undo.ts`): every `apply` that changes the model pushes the snapshot taken before it, so the undo unit is the intent whatever the projection made of it; each projection takes and restores its own opaque snapshot (freehand: the scene, constrained: the constraint model, dynamic: graph plus overlay). ⌘Z / ⇧⌘Z and the Undo / Redo toolbar buttons; a log belongs to one scene and empties on drill. ECHO history later.                                                                                                                                                                                                                                               |

## 8b. Lattice mode (designed 2026-10-06; steps 1-4 and 6 built)

A per-scene constraint in which every shape occupies whole cells of a lattice coarser than the snap grid,
separated by fixed gutters, so the scene reads as a regular board with gutter channels between shapes.

**Rule.** The lattice is parameterized by the size of a one-cell shape and the gutter (channel) between
shapes: `LatticeSpec { width, height, gutterX, gutterY }`, by default 256x128 and 128x64, set per scene
(`scene.layout = { kind: 'lattice', ...spec }`; absent is freehand) and edited in the properties panel when
nothing is selected. The pitch is a shape plus a gutter (384 x 192 by default). A shape spans any whole
number of cells on each axis and covers the gutters between them, so its frame is
`n x width + (n - 1) x gutterX` by `m x height + (m - 1) x gutterY` (a 3x1 shape is 1024 x 128): a shape is
its first cell and spans `(col, row, spanX, spanY)`. Every channel between shapes is exactly one gutter
wide. Resizing snaps the dragged face to the nearest cell edge and leaves the opposite face where it was,
so a face steps one cell at a time. Shapes may not share a cell.

**Where it lives.** Nodes stay in scene pixels: the lattice is a rule a projection enforces, not a second
coordinate system, so persistence, the DSL bridge and freehand are untouched. (Storing cell units and
deriving pixels, as the constrained and dynamic projections do, was rejected: it forks the stored shape of
a scene by mode.)

| Piece                        | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quantize(bounds, spec)`     | Pure: nearest whole span at the nearest cells per axis, then the frame its cells and inner gutters cover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Occupancy                    | The cells each shape covers; an intent that would overlap another shape's cells is rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Lattice projection           | Wraps the freehand reducer; every `create`, `move`, `resize` and geometry `update` is quantized, then checked for occupancy, so no path (gesture, properties panel, DSL) can break the rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `DrawScene.constrain?(edit)` | New optional hook the pointer machine's `settle` calls, so the ghost and resize previews show where the shape will land, and draw red when it would collide.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Grid layer                   | Draws cell boundaries, and the cells a dragged shape would occupy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Gutter routing               | `smart` links on a lattice scene route through the gutters (`utils/gutter-route.ts`): each end leaves its port straight out to the centre line of the adjacent gutter, and the route runs at right angles with the fewest bends along gutter centre lines and the lines through its ports; a port line runs straight through free cells, so a route detours into the gutters only around occupied ones (a shortest-path search where a turn costs far more than distance). A gutter inside a multi-cell shape is covered by it, so it is not a track. Lattice-specific rather than `@dxos/diagram`'s general router: the tracks are a regular grid, so the search is small. Line, curve and spline keep their routes. |
| Properties                   | Geometry reads as Column / Row and Span X / Span Y (whole cells, step 1) via `fieldOverrides`; the scene's spec when nothing is selected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Switching on                 | Every node is quantized once; a shape landing on occupied cells moves to the nearest free cells, in z-order, as one undoable batch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Snap and lattice toggles     | Snap (G) on with the lattice toggle (Shift+G, shown only on a lattice scene) on is lattice mode; snap on with the lattice off snaps to the basic grid; snap off is free. The projection reads both per intent (`constrained`), so outside lattice mode intents apply as freehand. Smart links route through the gutters whenever the lattice toggle is on, snap or not. A shape left off the lattice snaps onto it the next time it is moved. The guides toggle only hides the cells, which show only while the lattice is on.                                                                                                                                                                                        |
| Dynamic projection           | The dynamic projection takes the same spec (`DynamicOptions.lattice`): it ranks the graph one node per cell and snaps moved nodes' overrides onto free cells, so a derived graph (a feature map) shows the same guides.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Lanes and crossings.** Routing each link on its own puts parallel links on the same gutter centre line,
drawn on top of each other. The standard answer, from VLSI routing and orthogonal connector routing
(libavoid: Wybrow, Marriott and Stuckey), splits the work in two:

1. _Global routing_ — each link's path through the gutter network. `gutterRoute` is this step: a maze
   search over gutter centre lines with a bend cost. Later: route a scene's links together with a
   congestion cost per gutter segment (PathFinder's negotiated congestion: route all, raise the cost of
   overused segments, rip up and reroute) and a cost for crossing another link, so links spread over
   the gutters and cross less.
2. _Detailed routing_ — giving each link its own lane in each gutter it uses. Links sharing a collinear
   run are separated across the gutter, ordered so that their turn-offs do not cross (the
   metro-line crossing problem), with ports sliding along their shape's side. `@dxos/diagram`'s
   `Nudge.nudge` does exactly this over a set of orthogonal polylines, with shapes as obstacles.

Since a link's lanes depend on the other links, routing becomes a per-scene pass: `viewLinkGeometry`
routes every smart link of a lattice scene, nudges the routes together (one minor grid unit apart), and
each layer reads its links' geometry from that pass, memoized on the scene. Lanes per gutter are
bounded by the gutter width over the spacing (64 / 16 gives three either side of the centre line), so a
congested gutter is a signal for the global step, not something nudging can fix.

**Later.** Reflow: an overlapping drop pushes the other shapes aside instead of being rejected.

## 9. Package layout

```
packages/plugins/plugin-canvas/src/            (phase 3: the illustrator drawing variant `dxos.org/scene/1`)
  model/content.ts  Drawing.Canvas.content encoding: one record per scene, node and link; readViews / writeViews
  model/handler.ts  SceneHandler: illustrator DSL objects ↔ root-scene nodes and links (identity on the records)
  model/            layout-source / layout-writer / model-writer: the drawing as a SceneDocument, written by intents
  containers/       CanvasArticle and SceneArticle: SceneEditor over the drawing's document
  capabilities/     DrawingVariant (IllustratorCapabilities.VariantProvider), Translations

packages/ui/react-ui-canvas/src/          the SURFACE (2D engine, 3D renderer, read-only views, kinds, headless rules)
  index.ts                 the root: builder, components, engine, generator, hooks, kinds, lift, model, modes, utils, viewport2d
  headless.ts              `./headless`: React-free model and rules for operations (no editor, no Babylon)
  model/                   render lists, registries, keys, themes and style sets, the viewport contract, sampleDocument
  engine/                  the draw state, the draw scene, view atoms, history, the React-free CanvasController
  utils/                   pure functions: geometry, routing, link ends, ports, hit tests, the SceneEdits, clipboard
  modes/                   lattice, constrained, dynamic, ranks, scored; constrain2D and graphLayout
  kinds/                   ElementKindSpec, kindRegistry, kindNodeDef
  viewport2d/              render lists ↔ Layout2D (toRenderLists2D) and the writes a gesture leaves (layoutWrites)
  lift/                    a 2D layout lifted into 3D (liftScene, camera2DTo3D), type-only on the renderer
  three/                   `./3d`: the Babylon renderer, manifold solids, Scene3DView; `three/io` is `./io`
  components/              Canvas (Root + Viewport, with a `shell` slot), SceneLayer, ControlFrame, Grid, LatticeGrid,
                           PartEditor, Background, FrameHeader, SceneContextMenu, Scene2DView
  hooks/, builder/, generator/ (`./motion`, `./generator-worker`), testing/ (`./testing`)
  entries.test.ts          the light entries load neither @babylonjs, manifold-3d nor the editor

packages/ui/react-ui-canvas-editor/src/   the APPLICATION (depends on react-ui-canvas; never the reverse)
  editor/                  SceneEditor, the config contract, store, commands, history, clipboard, timeline, sections
  dimensions/              config2d / config3d, tools2d / tools3d, Viewport2D / Viewport3D, the canvas bridge, element forms
  components/              panels, inspectors, Toolbar, Breadcrumbs, StyleGrid, Scene3DEditor, CanvasEditor (the
                           engine's own chrome over Canvas.Root, for stories and the e2e suites)
  views/                   Graph2DView
  testing/, playwright/    fixtures; e2e over the CanvasEditor stories
```

`.oxlintrc.json` forbids react-ui-canvas from importing the editor package, and `src/entries.test.ts` checks the same
direction and that the root, `./headless`, `./motion`, `./generator-worker` and `./testing` load no 3D runtime.

## 10. Phases

0. **PR 0**: extract `plugin-illustrator/src/model` (minus `builder.ts`) to `packages/common/diagram`
   (`@dxos/diagram`), update import sites, add the DSL gaps (arrow ports, portal element, `index`).
1. **Phase 1 (first PR)**: types, registry, projection seam, freehand + constrained + dynamic projections
   (minimal), store, camera, hit testing, ports with automatic pairing, curve routing, fractional index;
   `Canvas` with grid, wheel/pinch/pan, select/marquee, control frame with move + resize, port-drag linking,
   drill-in/out (double-click, auto, Escape, breadcrumbs, history), palette with rect / link / scene; **four
   stories**: `Freehand` (nested fixture), `Constrained` (cardinal constraints; dragging rewrites them),
   `Dynamic` (object graph → layout; toggle nodes to re-layout; drag writes an override), `Nested` (depth 4);
   unit tests for every pure module.
2. **Phase 2**: text and object cells with `Surface` + type projectors, ortho routing, snap lines, keyboard nudge,
   undo log, portal thumbnails, external drag-in, mixed-variant scenes; **mobile navigation mode** (§6b):
   `aspects.ts`, `ColumnStrip`, mode switch with state carried across, a `Columns` story at phone width and a
   viewport-toggle story that switches modes on the same scene.
3. **Phase 3**: ECHO-backed store via `makeBuilder({schema: 'dxos.org/scene/1', handler: SceneHandler})` over
   `Drawing.Canvas.content`; portals reference `Drawing`s; dynamic projection over a real ECHO query; deep links;
   `plugin-canvas` contributes a `VariantProvider` (article + card) instead of its own object type.
4. **Phase 4**: retrofit `react-ui-canvas-editor` (compute shapes as cell defs), retire the old `Canvas` exports,
   delete `react-ui-canvas-editor/src/types/schema.ts`; the tldraw/excalidraw variants keep working unchanged.

## 11. Testing

- Vitest (node) for `camera.ts`, `hit.ts`, `ports.ts`, `index.ts`, `store.ts`, and each projection: round
  trips, zoom-about-point invariance, `enterPortal ∘ exitPortal = id`, coverage thresholds, tier hysteresis,
  automatic port pairing re-attaches after a move, a constrained `move` rewrites the expected constraint and the
  re-solve honours it, a dynamic override survives an unrelated graph change and is dropped when its node goes.
- Storybook: the four stories above; a scripted story exercising drill-in/out, linking and drag via Playwright in a
  later phase; `Columns` (phase 2) at a phone viewport, plus a mode-toggle story asserting the 2D ↔ columns state
  mapping.
- `aspects.ts` is pure: reading order is total and stable under a move that does not cross another cell, a
  reorder drop between two rows on one line lands between them, every link's ends resolve to rows, a `scene:`
  column of a portal equals the child's `overview`, and the anchor mapping round-trips (`2D → columns → 2D` fits
  the same cell; `columns → 2D → columns` makes the same row the first fully visible one) for every aspect kind,
  including an empty scene.
- Manual test script on each story (numbered).

## 12. Open questions

1. Portal aspect: letterbox (prototype) or stretch?
2. Default extent of an empty scene: fixed 1600×1000 or viewport-derived?
3. Palette in the engine or the plugin toolbar (engine ships a minimal one for the stories)?
4. Constrained DSL surface: the constraint grammar is a dialect input; its `compile` emits `Scene.Command`s. Open:
   whether `move` rewrites the grammar (source of truth) or the commands (derived).
5. Should a portal reference a `Drawing` (listable, named) or a hidden `Canvas`? Prototype: `Drawing`.
6. Mobile aspects (§6b): is the built-in set (overview, per kind, links, cell detail, nested scene) the right
   notion of "aspect", or should aspects be host-defined facets of an object (e.g. a person's tasks, mail,
   documents) that the plugin contributes through `CellDef.aspects`? The design supports both; which ships
   first decides whether phase 2 needs the `CellDef` hook.
7. Mode switch trigger: media queries only, or also a user toggle in the toolbar on desktop (columns as a reading
   mode for large diagrams)?

## 13. Canvas core: services, state and a controller (designed 2026-10-18, not built)

`CanvasRoot` (`components/Canvas/Canvas.tsx`, ~1,380 of its 2,507 lines) builds one context of 88 fields and passes it to
eleven parts. An inventory (2026-10-18) found:

| Measure               | Count                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| Fields by kind        | atom-state 20, derived 14, command 16, handler 14, service 8, config 8, other 8 |
| Fields by change rate | static 21, rare 26, per-edit 19, per-gesture 14, per-frame 8                    |
| Fields by readers     | none 14, one part 57 (39 of them Viewport), several parts 17                    |

Three consequences:

1. **Every part re-renders on every camera change.** The provider memoizes on all field values
   (`react-hooks/src/createContext.ts:28`), and eight fields change per frame (camera, pointer, focus, frameUnit,
   latticeBounds, time, generated, toolbarActions). During playback the scene-keyed fields (`scene`, `displayScene`,
   handlers, paste) are per-frame too, since the projection animates.
2. **`toolbarActions` is per-frame by accident**: `createAtCentre` closes over the camera-derived `pointer`.
3. **Most of the context is Viewport's private state routed through the root**, and fourteen fields are read by no
   part (the root binds them itself).

### 13.1 Target: aspects

The state stays where it is (the draw state, `CanvasAtoms`); what changes is how parts reach it. The context
is split by **aspect**: a functional slice of the canvas pairing the atoms that hold its state with the commands that
change it. Every value an aspect exposes is stable for the life of the canvas (atoms, registries, command functions),
so a part re-renders only for the atoms it subscribes to, never because the context changed.

```
Document (host's)           SceneDocument, written only through LayoutIntents
Draw state (engine)         DrawState: views, view(id), styles → DrawScene { scene, apply, capabilities, constrain }
View state (CanvasAtoms)    Navigation · Selection · Gesture · Editing · Tools · Time · Look
                                │  each aspect: its atoms + its controller commands
Context (one provider)      services: registry, atoms, store, registries, capabilities, readonly, controller
  ├─ useCanvasDocument()    ├─ useCanvasNavigation()   ├─ useCanvasSelection()   ├─ useCanvasTools()
  ├─ useCanvasLook()        └─ optional providers:  TimeProvider · GestureProvider · EditingProvider
Parts                       read atoms with useAtomValue; call commands; derive their own values
```

Delivery: **one static provider** in `CanvasRoot` holds the services, the atoms and the controller, and each aspect
has a hook that returns only its slice. Sharing one provider costs nothing because nothing in it changes. Three aspects
that a canvas may lack or a host may replace get **their own provider**: Time (no timeline), Gesture and Editing (a
read-only view mounts neither, so its parts cannot reach their commands).

| Aspect         | Purpose                                      | State (atoms)                                                     | Commands                                                                                        | Derived (computed by its reader)                                                                                               | Hook / provider                  | Read by                                               |
| -------------- | -------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| **Document**   | What the canvas shows and the one write path | `store.views`, `store.styles`, `projection.scene`; `capabilities` | `apply` and the intent helpers: create, delete, update, reorder, group, ungroup                 | `scene` (current View), `look` inputs                                                                                          | `useCanvasDocument()` · shared   | Viewport, Properties, Layers, Objects, About          |
| **Navigation** | Where the camera is and which View is open   | `camera`, `path`, `history`, `isolation`                          | `drillIn`, `drillOut`, `goHistory`, `isolate`, `exitIsolation`, `fit`, `zoomIn/Out/At`, `panBy` | `bounds` (kept entry frame), `fitTarget`, `focus`, `frameUnit`                                                                 | `useCanvasNavigation()` · shared | Viewport, Navigation, Objects, Debug                  |
| **Selection**  | What is selected or under the pointer        | `selection`, `hover`, `linkHover`, `point`                        | `select`, `selectAll`, `clearSelection`, `deleteSelection`, `duplicateSelection`                | the selected instance, `selected` flag for the inspector panel                                                                 | `useCanvasSelection()` · shared  | Viewport, Properties, Layers, Actions                 |
| **Gesture**    | The pointer gesture in flight                | `drag`                                                            | the pointer machine's handlers (internal), `cancelDrag`                                         | `displayScene` (projection × drag), `createFrame`, `landing`, `blocked` — a derived atom, as Viewport and Objects both read it | `GestureProvider` · separate     | Viewport only (handlers); `displayScene` via its atom |
| **Editing**    | Text editing and the clipboard               | `editing`, `active`, `clipboard`                                  | `editPart`, `commitPart`, `cancelPart`, `copy`, `cut`, `paste`                                  | —                                                                                                                              | `EditingProvider` · separate     | Viewport, Actions                                     |
| **Tools**      | The active tool and the grid aids            | `tool`, `linkType`, `layer`, `snap`, `guides`, `lattice`, `debug` | `setTool`, `toggleSnap`, `toggleGuides`, `toggleLattice`, `toggleDebug`, `createAtCentre`       | `grid` (snap spacing for the zoom), `latticeBounds`                                                                            | `useCanvasTools()` · shared      | Tools, Theme, Viewport, Debug                         |
| **Time**       | The clock and keyframing                     | `clock.time`, `clock.playing`, `autoKey`                          | `play`, `pause`, `seek`, `toggleAutoKey`, the timeline key commands                             | `fps`, the sampled scene (inside `projection`)                                                                                 | `TimeProvider` · separate        | Timeline, Viewport                                    |
| **Look**       | Theme and background                         | theme override, background grid (host props or atoms)             | `setTheme`, `setBackgroundGrid`                                                                 | `look`, `themeGrid`                                                                                                            | `useCanvasLook()` · shared       | Theme, Viewport                                       |

Rules:

1. **Values never go in a context.** An aspect hook returns atoms and functions; a part calls `useAtomValue` on the
   atoms it draws. The services object is created once per canvas and never rebuilt.
2. **Commands read state when called**, from the registry, never from a render-time closure, so their identity never
   depends on state (the `createAtCentre`/`pointer` bug in the findings above is this rule broken).
3. **Derived state lives with its reader.** A value read by one part is computed in that part; a value read by several
   parts becomes a derived atom on the aspect (`displayScene`).
4. **The controller is organised by aspect**: `controller.navigation.drillIn(…)`, `controller.selection.delete()`, and
   so on, React-free in `engine/controller.ts`, unit-tested per aspect. Every command that edits the document goes
   through `Document`'s `apply`, which Phase 6 replaces with `CanvasOperation.Apply` (VIEWS.md §8).
5. **Undo leaves `CanvasAtoms`** in Phase 6 (the scoped `HistoryTracker`), and `layers` becomes the document-wide tag
   table in Phase 3; both are aspect changes, not new contexts.

### 13.2 Phases

Each phase is one commit with the Canvas, panels and inspectors story tests and a Storybook smoke render after it.

1. **Prune.** Remove the 14 dead fields (bind them in `CanvasRoot` only); read the camera at call time in
   `createAtCentre`; drop the unused memo dependencies; fix the inconsistencies the inventory found (the
   `drillIn` type, the duplicated menu delete, Timeline writing atoms directly, panels calling `useRegistry()`).
2. **Viewport owns its state.** Viewport reads its atom-state itself and computes its own derived values
   (`latticeBounds`, `focus`, `frameUnit`, `createFrame`, link-hover handlers, `themeGrid`).
3. **Aspects.** The services provider, the shared aspect hooks and the Time, Gesture and Editing providers; the
   `displayScene` derived atom. A story test counts panel renders across a scripted pan and asserts they do not
   grow with it.
4. **Controller.** `createCanvasController` in `engine/`, organised by aspect, with node unit tests per aspect;
   `CanvasRoot`, the keys, menus and panels call it.
5. **Split Viewport** into Background, Scene and Overlay, and the remaining parts into their own files.

Done when: no part but Viewport re-renders on a pan (measured by the story test), the controller's commands are
unit-tested without React, and no file in `components/Canvas` exceeds ~600 lines.
