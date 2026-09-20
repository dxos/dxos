# plugin-canvas — Design

Status: spec for review (2026-09-20, rev 5: §4b layers and data structures as built, §9 synced; rev 4: §6b mobile
navigation mode; rev 3: §3b illustrator DSL reuse, PR 0). Inputs: `AUDIT.md` (existing surfaces), `RESEARCH.md` (external
landscape), and a throwaway spike (deleted once the engine's `Nested` story covered it; its findings are folded
into §5). Engine: `packages/ui/react-ui-canvas/src/scene/`, stories `ui/react-ui-canvas/scene/SceneView`.

## 1. Goal

An infinite, zoomable canvas that represents diagrams at multiple depths. A **scene** is one level of detail; it
holds **cells** (rectangles, text, ECHO object cards, links, and portals to child scenes). Zooming into a portal
drills to the child scene; zooming out returns to the parent. Cells host live HTML (editors, `Surface`s).

The canvas is a **set of layered systems**: the drawing model (what is true), a layout projection (where things
are), and the surface (how they are drawn and manipulated) are separate, so the same surface serves freehand
diagrams, constraint-driven diagrams, and diagrams projected from an external ECHO graph.

Non-goals for the prototype: freehand drawing, cross-scene links, multiplayer cursors, export formats.
`react-ui-canvas-editor` and `plugin-conductor` keep working untouched until the engine replaces them.

## 2. Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Rewrite** a new engine; do not adopt `@xyflow/react` or tldraw                                                                                                                                                                                                                                                                                                                                                                | xyflow has one viewport per instance, a 0.5–2× zoom design, flat nested divs with z-index bugs and one store per instance; tldraw's SDK license blocks production. See `AUDIT.md` §5.  |
| 2   | Engine lives in **`packages/ui/react-ui-canvas/src/scene/`** during development                                                                                                                                                                                                                                                                                                                                                 | It replaces the current `Canvas` eventually; a sibling folder keeps the old exports intact for canvas-editor/compute/sequencer until the switch.                                       |
| 3   | **All type definitions local** to the package (Effect `Schema`, no ECHO `Type.makeObject` yet)                                                                                                                                                                                                                                                                                                                                  | `react-ui-canvas-editor/src/types/schema.ts` is replaced only once the prototype works; a plain schema wraps into an ECHO type without change.                                         |
| 4   | **Depth = scene nesting**; within a scene one flat coordinate space                                                                                                                                                                                                                                                                                                                                                             | Containment is the hierarchy; grouping inside a scene is visual only.                                                                                                                  |
| 5   | **Per-scene local coordinates**, doubles, unit = CSS px at zoom 1                                                                                                                                                                                                                                                                                                                                                               | A global `(x, y, depth)` compounds float32 error in the compositor after a few levels and couples separate documents.                                                                  |
| 6   | **Scene bounds are derived** from content (union of placed cells, padded), never stored                                                                                                                                                                                                                                                                                                                                         | Muse "flex boards"; a portal maps the child's derived bounds into the cell.                                                                                                            |
| 7   | **Rendering: DOM root** with the camera as one CSS transform; SVG as layers (links, overlay); canvas2d only for thumbnails. No third-party engine                                                                                                                                                                                                                                                                               | Cells host live React content; SVG `foreignObject` is unreliable; pixi/konva cannot host HTML.                                                                                         |
| 8   | **d3 only as pure functions**: `interpolateZoom`, `d3-shape` curves                                                                                                                                                                                                                                                                                                                                                             | Native Pointer Events replace d3-zoom/d3-drag and keep React owning the DOM.                                                                                                           |
| 9   | **Links are cells** with `{cell, port?}` endpoints                                                                                                                                                                                                                                                                                                                                                                              | One map gives ordering, selection, undo and nesting uniformly; a missing port means "automatic".                                                                                       |
| 10  | **Two live depths max** (root + one nested), further depths as previews                                                                                                                                                                                                                                                                                                                                                         | Bounded DOM; verified in the spike.                                                                                                                                                    |
| 11  | **The surface never writes coordinates.** It emits _intents_ (move, resize, link, create, delete) to a `Projection`, which owns the drawing model and re-projects                                                                                                                                                                                                                                                               | This is what makes variants 1–3 share one surface.                                                                                                                                     |
| 12  | **Ports come from the cell definition** (`CellDef.ports`), not from the data                                                                                                                                                                                                                                                                                                                                                    | Same as anchors in canvas-editor's `ShapeRegistry` and `Port {side, offset}` in react-ui-diagram; shape-specific, not per-instance.                                                    |
| 13  | **The engine is a `Drawing` variant** (`schema 'dxos.org/scene/1'`); illustrator's scene DSL commands are the write API behind the projection seam; the headless model is extracted to `@dxos/diagram` first                                                                                                                                                                                                                    | §3b: the ECHO envelope, agent operations, dialects and layout engines already exist; a UI package cannot depend on a plugin.                                                           |
| 14  | **Mobile navigation mode: the same scene rendered as columns.** On narrow or touch-only viewports the view switches from the 2D camera to a horizontal sequence of full-height **columns**, one per _aspect_ of the current scene, navigated by swipe, tabs or the breadcrumb; each column scrolls vertically. Aspects are read-only projections of the positioned `Scene`, so the model, projections and intents are unchanged | A 2D infinite canvas is unusable at phone width (pinch precision, no hover, no wheel, no keyboard); a linear column per aspect is how Composer already presents planks on mobile. §6b. |

## 3. Layered architecture

```
 drawing model (source of truth)      projection (layout)                 surface (render + interact)
 ┌──────────────────────────┐        ┌──────────────────────────┐        ┌──────────────────────────┐
 │ 1 freehand: Scene cells  │──id──▶ │ positioned Scene         │──atom─▶│ SceneView / SceneLayer   │
 │   with center/size       │◀─set── │                          │◀intent─│ control frame, ports,    │
 ├──────────────────────────┤        ├──────────────────────────┤        │ camera, selection, tools │
 │ 2 constrained: DSL       │──solve▶│ positioned Scene         │──atom─▶│                          │
 │   (commands/constraints) │◀rewrite│                          │◀intent─│                          │
 ├──────────────────────────┤        ├──────────────────────────┤        │                          │
 │ 3 dynamic: ECHO graph    │─layout▶│ positioned Scene         │──atom─▶│                          │
 │   + optional overrides   │◀overr.─│ (engine + overrides)     │◀intent─│                          │
 └──────────────────────────┘        └──────────────────────────┘        └──────────────────────────┘
```

**Projection seam** (the only thing the surface knows):

```ts
type Projection = {
  scene: Atom<Scene>; // positioned cells; re-emitted on every model change
  apply: (intent: Intent) => void; // may reject, partially apply, or rewrite the model
  capabilities: { move?: boolean; resize?: boolean; link?: boolean; create?: boolean };
};

type Intent =
  | { kind: 'move'; ids: CellId[]; delta: Point }
  | { kind: 'resize'; id: CellId; bounds: Bounds }
  | { kind: 'link'; source: Endpoint; target: Endpoint }
  | { kind: 'create'; cell: Cell }
  | { kind: 'delete'; ids: CellId[] }
  | { kind: 'reorder'; id: CellId; z: string };
```

| Variant           | Model                                                                                                                   | `project`                                                                                                                                                                 | `apply(move A by Δ)`                                                                                                                                                     | Existing pieces to reuse                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **1 freehand**    | `Scene` with stored `center/size` (tldraw-like)                                                                         | identity                                                                                                                                                                  | writes `center`                                                                                                                                                          | the spike                                                                               |
| **2 constrained** | a DSL: `plugin-illustrator` `Scene.Command`s, or cardinal constraints (`A east of B`, `A aligned with B`, `A inside G`) | a solver (cardinal constraints → longest-path ranks per axis, then packing); or a dialect's `compile`                                                                     | classifies the drop against neighbours and **rewrites the constraint** (A dragged left of B → `A west of B`), then re-solves; ambiguous drops are rejected and snap back | illustrator `dialect.ts`, `layout.ts` (`rank`), `uml-grid.ts`, `ortho-router.ts`        |
| **3 dynamic**     | an external ECHO graph (objects + relations)                                                                            | a layout engine (illustrator `Layout.rank`, dagre, ELK) produces cells and links; an `Overlay {positions, collapsed, labels}` (react-ui-diagram's pattern) applies on top | fixed layout: reject; hybrid: write an override into the `Overlay`; graph edits re-run the engine and overrides that still resolve survive                               | react-ui-diagram `types/diagram.ts` (`Overlay`), `model/layout.ts`; illustrator engines |

Variant 2 needs a **relative coordinate system** in the DSL: constraints are expressed in a named frame
(`grid`, `lanes`, `radial` later). The solver for the prototype is deliberately small: cardinal relations only,
one rank pass per axis, equal cell sizes, snapped to the grid.

Mixed scenes are allowed at the cell level in phase 2 (a freehand scene containing a portal to a dynamic scene is
already supported, since the projection is per scene).

## 3b. Reusing plugin-illustrator's DSL mechanism

`plugin-illustrator` already implements the layered split in §3 for third-party canvases. Its layers, and what
each one gives the new engine:

| Illustrator layer                                                                                                                                   | What it is                                                                                                                                                                                                                                                                                                  | Use in the new canvas                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/Drawing.ts`                                                                                                                                  | `Drawing {name, canvas: Ref(Canvas)}`; `Canvas {schema, content: Record<id, any>}`, a hidden, opaque, CRDT-merged record map claimed by a renderer via `schema`                                                                                                                                             | **The Scene ECHO type.** A scene _is_ a `Canvas` with `schema = 'dxos.org/scene/1'` whose `content` is the cell map (§4). No new ECHO type; name, graph node, create flow, card/article scaffolding and the shared selection model come from the plugin. A portal references a `Drawing` (`Ref`), so nested scenes are first-class documents and Muse "linked cards" are just two portals to one drawing.                                 |
| `model/scene.ts`                                                                                                                                    | Renderer-neutral DSL: `WorldObject {id, origin, scale, ref, elements}` in object-local units; elements rect/ellipse/diamond/triangle/circle/line/curve/arc/text/arrow; `Arrow {from, to}` bound to `"object/element"` refs; edit `Command`s (`upsert-object`, `upsert-elements`, `remove-*`, `move-object`) | **The write language behind the projection seam.** Intents compile to commands: move → `move-object`, create → `upsert-object`, delete → `remove-object`, link → `upsert-elements` with an `arrow`, resize → `upsert-elements` with the resized box. Bound arrow endpoints that "track their target" are the automatic links of §4.                                                                                                       |
| `model/content.ts`                                                                                                                                  | `ContentHandler {identify, render, read, translate, scaffold?, merge?, prune?}` + `applyCommands(content, commands, handler)`: command semantics over any record map, identity stamped per record                                                                                                           | **`SceneHandler`**: identity = `{object: cell.group ?? cell.id, element: cell.id}`; `render` compiles an object's elements into cells (box → rect/text, text → text, arrow → link, `ref` → object cell) with the placement folded into cell centres and a `group` tag; `read` rebuilds world objects from the tag with origin = bbox top-left; `translate` shifts centres. `svg-handler.ts` (DSL as persistence) is the closest template. |
| `model/builder.ts`                                                                                                                                  | `makeBuilder({schema, handler})` → `{read(canvas), apply(canvas, commands)}` under `Obj.update`                                                                                                                                                                                                             | The phase 3 ECHO store: `SceneBuilder = makeBuilder({schema: 'dxos.org/scene/1', handler: SceneHandler})`. The only file in `model/` that imports `@dxos/echo`.                                                                                                                                                                                                                                                                           |
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

```ts
Point  = { x, y }            Size = { width, height }
Camera = { x, y, zoom }      // screen = (scene + {x, y}) * zoom

Scene = { id, name?, cells: Record<CellId, Cell> }   // positioned; the surface's input

Cell = Base & (Rect | Text | Object | Portal | Link)
Base     = { id, kind, z: string /* fractional index */, locked?: boolean }
Placed   = { center: Point, size: Size }
Rect     = Placed & { kind: 'rect', label?, style? }
Text     = Placed & { kind: 'text', text }
Object   = Placed & { kind: 'object', object: Ref, overrides?: Partial<CellProps> }  // Surface + derived props
Portal   = Placed & { kind: 'scene', scene: SceneId }
Link     = { kind: 'link', source: Endpoint, target: Endpoint, ends?, route?: 'curve' | 'ortho' }
Endpoint = { cell: CellId, port?: PortId }             // no port = automatic (closest appropriate pair)

CellDef  = { kind, component, ports(cell): Port[], resizable?, minSize?, openable? }   // registry, per kind
Port     = { id, side: 'n'|'e'|'s'|'w', offset: number /* 0..1 along the side */, accepts?: LinkKind[] }
```

- `bounds(scene)` is derived: union of placed cells plus padding; an empty scene gets a default extent.
- **Derived properties**: an `Object` cell's displayed props (label, icon, colour, summary, ports) come from a
  `projector(obj) → CellProps` chosen by the object's type, merged under `cell.overrides`. Rendering goes through
  `Surface` so plugins own the card body; the projector only supplies what the frame and ports need.
- **Automatic links**: when either endpoint has no `port`, the router picks the port pair with the shortest
  distance among ports whose `accepts` matches; it is recomputed whenever the projection re-emits, so re-arranging
  the diagram re-attaches links. A user who drags a link end onto a specific port pins it (`port` set); dragging it
  onto the cell body unpins it.
- A scene referenced from two portals is a Muse "linked card"; nothing forbids it.
- Ephemeral state (selection, hover, drag offset, camera, scene path) lives in per-view atoms, never in the model.

## 4b. Layers and data structures as built

Four layers, each one an Effect atom the next one subscribes to; nothing below a layer knows what is above it.

```
 store              projection               view state                surface
 ┌───────────────┐  ┌────────────────────┐   ┌───────────────────────┐ ┌──────────────────────────────┐
 │ SceneStore    │  │ Projection         │   │ SceneViewAtoms        │ │ SceneView                    │
 │  scenes:      │─▶│  scene: Atom<Scene>│──▶│  camera, path,        │▶│  grid ▸ SceneLayer ▸ overlay │
 │   Atom<Map>   │  │  apply(Intent)     │◀──│  selection, hover,    │ │  pointer machine, keys       │
 │  scene(id)    │◀─│  capabilities      │   │  tool, snap, drag,    │ │  CellProperties, Palette,    │
 └───────────────┘  └────────────────────┘   │  history              │ │  Breadcrumbs                 │
                     freehand | constrained  └───────────────────────┘ └──────────────────────────────┘
                     | dynamic                (per view, never stored)  (React; reads atoms, emits intents)
```

| Layer          | Owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Data structure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store**      | Every scene of a document, by id (`store.ts`). In memory now; the ECHO `Canvas.content` map in phase 3. Writes go through `updateScene(registry, store, id, fn)`, a no-op when `fn` returns the same object.                                                                                                                                                                                                                                                              | `SceneStore = { scenes: Atom.Writable<Record<SceneId, Scene>>, scene(id): Atom<Scene \| undefined> }`; the per-id atom is derived and cached so a view subscribes to exactly the scene it shows.                                                                                                                                                                                                                                                                                                                                             |
| **Projection** | The meaning of an intent for one scene (`projection.ts`, `projections/*`). `freehand` is the identity (`reduceIntent`, a pure reducer over `Scene`); `constrained` keeps a `ConstrainedModel {nodes, constraints}` and re-solves; `dynamic` keeps a `GraphModel {nodes, edges}` plus an `Overlay {positions}` and re-lays out. Each returns a `Projection` over its own atoms.                                                                                            | `Projection = { scene: Atom<Scene>, apply(intent), capabilities }`. `Intent = move {ids, delta} \| resize {id, bounds} \| link {id, source, target} \| create {cell} \| delete {ids} \| reorder {id, z} \| update {id, values}`. `Capabilities` flags which intents the projection accepts; the surface greys out the rest.                                                                                                                                                                                                                  |
| **View state** | Everything ephemeral for one view (`atoms.ts`): the camera, the scene path (breadcrumbs), selection, hover, the active tool, the grid/snap toggle, the in-flight drag and the drill history. Created by `createSceneViewAtoms(root)` and optionally owned by the host, so two views of one scene stay independent and a panel (properties, constraint list) shares the view's selection.                                                                                  | `SceneViewAtoms = { camera: Atom.Writable<Camera>, path: Atom.Writable<SceneId[]>, selection: Atom.Writable<ReadonlySet<CellId>>, hover, tool: Tool, snap: boolean, drag: Drag \| undefined, history: {entries, index} }`. `Drag` is a union of the pointer machine's states: `pan {last}`, `marquee {from, to, additive}`, `move {ids, origin, anchor, delta}`, `resize {id, handle, start, bounds}`, `link {source, from, to, target?}`, `create {tool, from, to}`; the transient result is rendered, the intent is emitted on pointer-up. |
| **Surface**    | Rendering and gestures (`SceneView.tsx`, `SceneLayer.tsx`, `ControlFrame.tsx`). `SceneView` reads the atoms, runs the pointer state machine and key handling, and calls `projection.apply`. `SceneLayer` renders one scene under one CSS transform: a `div` per placed cell (component from the registry) and an `svg` of link paths; a live portal mounts a nested read-only layer. `ControlFrame` draws the selection outline, handles, ports, marquee and rubber band. | `CellRegistry = Record<kind, CellDef>` with `CellDef = { kind, component, ports(cell), resizable?, minSize?, openable? }` (decision 12). `LinkGeometry = { link, path, source: RouteEnd, target: RouteEnd }` is computed per render from `pairPorts` + `curvePath`. `Tier = dot \| preview \| live` per portal from its screen size with hysteresis.                                                                                                                                                                                         |

The model on the wire between the layers is the positioned `Scene` of §4: `{ id, name?, cells: Record<CellId, Cell> }` with `Cell = RectCell | TextCell | PortalCell | LinkCell`, every cell carrying `{ id, kind, z, locked? }`, placed cells `{ center, size }`, links `{ source: Endpoint, target: Endpoint, route? }`. Scene bounds, hit tests, port positions and link routes are all derived from it (`hit.ts`, `ports.ts`, `route.ts`, `camera.ts`) and never stored; `order.ts` supplies the fractional `z` keys.

Data flow for one gesture: pointer-down hit-tests the positioned scene in scene coordinates → the surface writes a `Drag` atom → each move updates the drag's transient geometry (snapped) and the surface renders the scene with `reduceIntent` applied locally for preview → pointer-up emits one `Intent` → the projection applies, rewrites or rejects it and writes its model (the store, a constraint set, an overlay) → the projection's `scene` atom re-emits → the surface re-renders. The undo unit is the intent.

## 5. Coordinate system and camera

- A view has a **scene path** (breadcrumbs) and a **camera** for the current root scene, zoom bounded to
  `[1/32, 32]`.
- **Portal mapping**: `s = min(cell.width / bounds.width, cell.height / bounds.height)`; child point `q` maps to
  parent point `cellOrigin + (q - bounds.origin) * s` (letterboxed; open question 1).
- **Drill-in** = animate the camera to fit the portal (`interpolateZoom`, 250–800 ms), then swap the root scene
  and re-express the camera in child space (`enterPortal`); **drill-out** is the inverse (`exitPortal`) followed
  by a fit of the parent. Both verified seamless in the spike.
- **Auto drill**: after a zoom gesture settles (150 ms), a portal covering ≥ 85% of the viewport becomes the root;
  a root covering < 30% yields to its parent. The swap preserves coverage, so the two rules cannot oscillate.
- **Tiers** for a portal by on-screen size (`min(size) × composed zoom`): `< 40px` tile, `< 260px` title +
  cell count (later: rasterised thumbnail), else live child scene, only while `depth < 2`. Hysteresis of ±10% at
  the boundaries.

## 6. Navigation

| Gesture                                                                | Effect                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Double-click a portal, or Enter with a portal selected                 | Animated drill-in                                                            |
| Pinch/ctrl+wheel until a portal fills the view                         | Auto drill-in (no animation, camera preserved)                               |
| Escape, breadcrumb click, "Up", or zooming the root below 30% coverage | Drill-out (breadcrumb jumps several levels)                                  |
| Alt+← / Alt+→                                                          | Back / forward through a history of `{path, camera}` entries                 |
| Shift+1 / Shift+2 / Shift+0                                            | Fit scene / fit selection / reset zoom                                       |
| Double-click a non-portal cell                                         | Opens it (`CellDef.openable`, e.g. text editing, or the ECHO object)         |
| URL / deep link (phase 3)                                              | `{path, camera}` serialised so a location inside a nested scene is shareable |

## 6b. Mobile navigation mode

The 2D camera is replaced, not shrunk. Below the `md` breakpoint or when the primary input is coarse
(`(pointer: coarse) and (hover: none)`), and always when the host asks for it (`mode='columns'`), `SceneView`
renders the current scene as **columns**: a horizontally paged strip of full-height panels, one per **aspect**.
The `columns` mode reads the same positioned `Scene` from the same `Projection`; it adds no model state.

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

1. **Grid**: the existing multi-resolution SVG `GridComponent` fed `{scale: zoom, offset: camera × zoom}`.
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

Pointer Events state machine with tools: `select` (default), `hand`, `rect`, `text`, `scene`, `link`.

| Gesture                                                        | Behaviour                                                                                                                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wheel                                                          | Pan. Ctrl/cmd+wheel (trackpad pinch) zooms about the cursor. Touch pinch zooms about the midpoint.                                                                                                 |
| Space+drag, hand tool                                          | Pan. Drag on background in `select` = marquee (intersection); shift adds.                                                                                                                          |
| Click / shift-click                                            | Select / toggle; cmd+A selects all. Hit testing from the model in scene coordinates, never `getClientRects`.                                                                                       |
| Drag selected cells                                            | Transient offset atom, snapped in scene coordinates; on pointer-up one `move` intent (the undo unit). The projection decides what that means (§3).                                                 |
| **Control frame**                                              | Shown for the selection: outline, eight resize handles (`resize` intent, respects `CellDef.minSize`), ports on hover of the frame or with the `link` tool.                                         |
| Drag from a port (or from the frame edge with the `link` tool) | Rubber band; drop on a port pins both ends, drop on a cell body leaves the target automatic, drop on empty canvas creates a rect and links to it (canvas-editor behaviour). Emits a `link` intent. |
| Drag a link end                                                | Re-attach; onto a port pins, onto a body unpins.                                                                                                                                                   |
| Palette click then drag on canvas                              | `create` intent for rect, text or portal (new empty child scene).                                                                                                                                  |
| Keys                                                           | Arrows nudge (shift ×10), Delete, Escape, navigation keys from §6; via the attention-scoped hotkeys used by canvas-editor.                                                                         |
| External drag-in                                               | pragmatic-dnd drop target only; internal gestures are pointer-driven.                                                                                                                              |
| Undo                                                           | Per-view log of inverse intents (phase 2); ECHO history later.                                                                                                                                     |

## 9. Package layout

```
packages/ui/react-ui-canvas/src/scene/         (phase 1, as built; phase 2+ files marked †)
  types.ts          Schema: Scene, Cell (rect/text/scene/link), Endpoint, Port, Camera, Intent, Capabilities
  registry.ts       CellDef registry (component, ports, resizable, minSize, openable) + defaultRegistry
  projection.ts     Projection seam, reduceIntent (freehand reducer), createFreehandProjection
  projections/
    constrained.ts  cardinal constraints → longest-path ranks per axis (Layout.rank); a move rewrites them
    dynamic.ts      GraphModel → ranked rows + Overlay position overrides; link adds an edge
  store.ts          SceneStore seam, createMemoryStore, updateScene / putScene
  camera.ts         zoomAt, panBy, fitBounds, portal mapping, enterPortal/exitPortal, coverage, animateCamera
  hit.ts            derived sceneBounds, hitTest, cellsIntersecting, bounds helpers
  ports.ts          default ports, portPoint, sideNormal, pairPorts (automatic pairing)
  route.ts          curvePath / curvePoint (cubic); ortho later †
  order.ts          fractional z keys: between, sortByZ, topZ, initialKeys
  atoms.ts          per-view atoms: camera, path, selection, hover, tool, snap, drag, history
  hooks.ts          useRegistry, useSceneProjection, useViewport, useWheel
  SceneView.tsx     root view: grid, camera, pointer state machine, keys, drill-in/out, snap
  SceneLayer.tsx    one scene under one transform: cell views, link svg, portal tiers, nested live layer
  ControlFrame.tsx  selection outline, resize handles, ports, marquee, rubber band
  CellProperties.tsx  schema-driven form over the selected cell (update intent)
  Palette.tsx, Breadcrumbs.tsx
  testing.ts        createSceneTree fixture
  *.test.ts         unit tests for every pure module and projection
  SceneView.stories.tsx (Freehand, Nested), Constrained.stories.tsx, Dynamic.stories.tsx
  handler.ts †      SceneHandler: ContentHandler over the cell map (phase 3, ECHO store)
  aspects.ts †      Aspect projections + reading order (§6b)
  columns/ †        ColumnStrip, Column, CellRow, AspectTabs (§6b)
```

Exported from the package under `./scene` (not the root barrel) until it replaces `Canvas`. The spike folder
`src/experimental/` was deleted when the `Nested` story covered it. `projections/*` use `@dxos/diagram`'s
`Layout.rank` directly today and become dialect wrappers over `applyCommands` through `SceneHandler` in phase 3;
nothing from illustrator is copied.

## 10. Phases

0. **PR 0**: extract `plugin-illustrator/src/model` (minus `builder.ts`) to `packages/common/diagram`
   (`@dxos/diagram`), update import sites, add the DSL gaps (arrow ports, portal element, `index`).
1. **Phase 1 (first PR)**: types, registry, projection seam, freehand + constrained + dynamic projections
   (minimal), store, camera, hit testing, ports with automatic pairing, curve routing, fractional index;
   `SceneView` with grid, wheel/pinch/pan, select/marquee, control frame with move + resize, port-drag linking,
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
