# plugin-canvas — Design

Status: spec for review (2026-09-20, rev 7: text parts with in-place editing and node style (§4), grid-aligned portal frame and navigation shield (§5), always-on grid (§7); rev 6: typed nodes and links (§4, decision 9), palette and spline editing (§8), `MIGRATION.md`; rev 5: §4b layers and data structures as built, §9 synced; rev 4: §6b mobile
navigation mode; rev 3: §3b illustrator DSL reuse, PR 0). Inputs: `AUDIT.md` (existing surfaces), `RESEARCH.md` (external
landscape), and a throwaway spike (deleted once the engine's `Nested` story covered it; its findings are folded
into §5). Engine: `packages/ui/react-ui-canvas/src/` (`model`, `utils`, `hooks`, `components`; barrel `src/scene.ts`), stories `ui/react-ui-canvas/scene/SceneView`.

## 1. Goal

An infinite, zoomable canvas that represents diagrams at multiple depths. A **scene** is one level of detail; it
holds typed **nodes** (rectangles, ellipses, UML classes, text, ECHO object cards, portals to child scenes) joined by
typed **links** (lines, curves, splines). Zooming into a portal
drills to the child scene; zooming out returns to the parent. Cells host live HTML (editors, `Surface`s).

The canvas is a **set of layered systems**: the drawing model (what is true), a layout projection (where things
are), and the surface (how they are drawn and manipulated) are separate, so the same surface serves freehand
diagrams, constraint-driven diagrams, and diagrams projected from an external ECHO graph.

Non-goals for the prototype: freehand drawing, cross-scene links, multiplayer cursors, export formats.
`react-ui-canvas-editor` and `plugin-conductor` keep working untouched until the engine replaces them.

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
| 11  | **The surface never writes coordinates.** It emits _intents_ (move, resize, link, create, delete) to a `Projection`, which owns the drawing model and re-projects                                                                                                                                                                                                                                                               | This is what makes variants 1–3 share one surface.                                                                                                                                                                                         |
| 12  | **Ports come from the cell definition** (`CellDef.ports`), not from the data                                                                                                                                                                                                                                                                                                                                                    | Same as anchors in canvas-editor's `ShapeRegistry` and `Port {side, offset}` in react-ui-diagram; shape-specific, not per-instance.                                                                                                        |
| 13  | **The engine is a `Drawing` variant** (`schema 'dxos.org/scene/1'`); illustrator's scene DSL commands are the write API behind the projection seam; the headless model is extracted to `@dxos/diagram` first                                                                                                                                                                                                                    | §3b: the ECHO envelope, agent operations, dialects and layout engines already exist; a UI package cannot depend on a plugin.                                                                                                               |
| 14  | **Mobile navigation mode: the same scene rendered as columns.** On narrow or touch-only viewports the view switches from the 2D camera to a horizontal sequence of full-height **columns**, one per _aspect_ of the current scene, navigated by swipe, tabs or the breadcrumb; each column scrolls vertically. Aspects are read-only projections of the positioned `Scene`, so the model, projections and intents are unchanged | A 2D infinite canvas is unusable at phone width (pinch precision, no hover, no wheel, no keyboard); a linear column per aspect is how Composer already presents planks on mobile. §6b.                                                     |

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
  scene: Atom<Scene>; // positioned nodes and links; re-emitted on every model change
  apply: (intent: Intent) => void; // may reject, partially apply, or rewrite the model
  capabilities: { move?: boolean; resize?: boolean; link?: boolean; create?: boolean };
};

type Intent =
  | { kind: 'move'; ids: CellId[]; delta: Point }
  | { kind: 'resize'; id: CellId; bounds: Bounds }
  | { kind: 'link'; link: Link }
  | { kind: 'create'; node: Node }
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

Scene = { id, name?, nodes: Record<NodeId, Node>, links: Record<LinkId, Link> }   // positioned; the surface's input

NodeBase = { id, type, z: string /* fractional index */, locked?, center: Point, ports?: Port[], style?: NodeStyle }
NodeStyle = { hue?: Hue /* theme hue: fill, text and border */, rounded?, fill?, border? }   // frame look; absent = default
Rect     = NodeBase & { type: 'rect', size: Size, label? }
Ellipse  = NodeBase & { type: 'ellipse', rx, ry, label? }
Class    = NodeBase & { type: 'class', size: Size, name, attributes: string[], methods: string[] }   // UML
Text     = NodeBase & { type: 'text', size: Size, text }
Portal   = NodeBase & { type: 'scene', size: Size, scene: SceneId }
Object   = NodeBase & { type: 'object', size: Size, object: Ref, overrides? }   // phase 2: Surface + derived props

LinkBase = { id, type, z, locked?, source: Endpoint, target: Endpoint }
Line     = LinkBase & { type: 'line' }
Curve    = LinkBase & { type: 'curve' }                       // cubic, tangent along each port's normal
Spline   = LinkBase & { type: 'spline', points: Point[] }     // Catmull-Rom through the control points
Endpoint = { node: NodeId, port?: PortId }                    // no port = automatic (closest appropriate pair)

NodeDef  = { type, name, icon, key, component, portsPerSide?, ports?(node): Port[], resizable?, minSize?, openable? }   // registry
LinkDef  = { type, name, icon, key }
Port     = { id, side: 'n'|'e'|'s'|'w', offset: number /* 0..1 along the side; drawn at the nearest major grid line */ }
```

- `shapes.ts` is the pure geometry of the types: `nodeBounds(node)` (the box, or the radii for an ellipse),
  `resizeNode(node, bounds)` (writes `size` or `rx`/`ry`), `createNode(type, …)` / `createLink(type, …)` defaults.
  The registry only renders and declares ports and flags; the projection never depends on it.
- `bounds(scene)` is derived: union of node frames plus padding, grown to the major grid; an empty scene gets a
  default extent.
- **Derived properties**: an `Object` node's displayed props (label, icon, colour, summary, ports) come from a
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
  `border-<hue>-border`), and toggles rounded corners, fill and border; the frame resolves the classes, the views
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
  Catmull-Rom through `[source, ...points, target]` emitted as cubic segments; `ortho` (phase 2) from
  `@dxos/diagram`'s router. A selected spline shows its control points as handles: drag moves one, double-click
  on the spline inserts one at the nearest segment, alt-click removes one; each is an `update` of `points`.
- A scene referenced from two portals is a Muse "linked card"; nothing forbids it.
- Ephemeral state (selection, hover, drag offset, camera, scene path, tool, last link type) lives in per-view
  atoms, never in the model.

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
| **Projection** | The meaning of an intent for one scene (`projection.ts`, `projections/*`). `freehand` is the identity (`reduceIntent`, a pure reducer over `Scene`); `constrained` keeps a `ConstrainedModel {nodes, constraints}` and re-solves; `dynamic` keeps a `GraphModel {nodes, edges}` plus an `Overlay {positions}` and re-lays out. Each returns a `Projection` over its own atoms.                                                                                            | `Projection = { scene: Atom<Scene>, apply(intent), capabilities }`. `Intent = move {ids, delta} \| resize {id, bounds} \| link {link} \| create {node} \| delete {ids} \| reorder {id, z} \| update {id, values}`. `Capabilities` flags which intents the projection accepts; the surface greys out the rest.                                                                                                                                                                                                                                |
| **View state** | Everything ephemeral for one view (`atoms.ts`): the camera, the scene path (breadcrumbs), selection, hover, the active tool, the grid/snap toggle, the in-flight drag and the drill history. Created by `createSceneViewAtoms(root)` and optionally owned by the host, so two views of one scene stay independent and a panel (properties, constraint list) shares the view's selection.                                                                                  | `SceneViewAtoms = { camera: Atom.Writable<Camera>, path: Atom.Writable<SceneId[]>, selection: Atom.Writable<ReadonlySet<CellId>>, hover, tool: Tool, snap: boolean, drag: Drag \| undefined, history: {entries, index} }`. `Drag` is a union of the pointer machine's states: `pan {last}`, `marquee {from, to, additive}`, `move {ids, origin, anchor, delta}`, `resize {id, handle, start, bounds}`, `link {source, from, to, target?}`, `create {tool, from, to}`; the transient result is rendered, the intent is emitted on pointer-up. |
| **Surface**    | Rendering and gestures (`SceneView.tsx`, `SceneLayer.tsx`, `ControlFrame.tsx`). `SceneView` reads the atoms, runs the pointer state machine and key handling, and calls `projection.apply`. `SceneLayer` renders one scene under one CSS transform: a `div` per placed cell (component from the registry) and an `svg` of link paths; a live portal mounts a nested read-only layer. `ControlFrame` draws the selection outline, handles, ports, marquee and rubber band. | `NodeRegistry = Record<NodeType, NodeDef>` and `LinkRegistry = Record<LinkType, LinkDef>` (decision 12); the palette is generated from both. `LinkGeometry = { link, path, source: RouteEnd, target: RouteEnd }` is computed per render from `pairPorts` + `curvePath`. `Tier = dot \| preview \| live` per portal from its screen size with hysteresis.                                                                                                                                                                                     |

The model on the wire between the layers is the positioned `Scene` of §4: `{ id, name?, nodes, links }` with typed `Node`s (centre plus per-type properties) and typed `Link`s (endpoints plus, for a spline, control points), every element carrying `{ id, type, z, locked? }`. Scene bounds, hit tests, port positions and link routes are all derived from it (`hit.ts`, `ports.ts`, `route.ts`, `camera.ts`) and never stored; `order.ts` supplies the fractional `z` keys.

Data flow for one gesture: pointer-down hit-tests the positioned scene in scene coordinates → the surface writes a `Drag` atom → each move updates the drag's transient geometry (snapped) and the surface renders the scene with `reduceIntent` applied locally for preview → pointer-up emits one `Intent` → the projection applies, rewrites or rejects it and writes its model (the store, a constraint set, an overlay) → the projection's `scene` atom re-emits → the surface re-renders. The undo unit is the intent.

## 5. Coordinate system and camera

- A view has a **scene path** (breadcrumbs) and a **camera** for the current root scene, zoom bounded to
  `[1/32, 32]`.
- **Portal frame**: the child-space region that maps exactly onto the portal, `portalFrame(portal, bounds)`: the
  portal's box scaled by the smallest whole factor that contains the child's derived bounds, placed on the major
  grid as near their centre as containing them allows. A whole factor keeps the frame's edges, and the child's
  grid seen through the portal, on the parent's grid, so the frame drawn once drilled in (dashed, orange) is the
  portal's own outline and sits on grid lines; the root shows its derived bounds. `s = 1 / factor`; child point
  `q` maps to parent point `cellOrigin + (q - frame.origin) * s`.
- **While the camera moves on its own** (wheel zoom or pan, an animation) the canvas ignores the pointer: a shield
  takes presses and hover is cleared, since nothing under the pointer is where it will be.
- **Drill-in** = animate the camera to fit the portal (`interpolateZoom`, 250–800 ms), then swap the root scene
  and re-express the camera in child space (`enterPortal`); **drill-out** is the inverse (`exitPortal`) followed
  by a fit of the parent. Both verified seamless in the spike.
- **Auto drill**: after a zoom gesture settles (150 ms), a portal covering ≥ 85% of the viewport becomes the root;
  a root covering < 30% yields to its parent. The swap preserves coverage, so the two rules cannot oscillate.
- **Tiers** for a portal by on-screen size (`min(size) × composed zoom`): `< 40px` tile, `< 260px` title +
  cell count (later: rasterised thumbnail), else live child scene, only while `depth < 2`. Hysteresis of ±10% at
  the boundaries.

## 6. Navigation

| Gesture                                                                | Effect                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Double-click a portal, or Enter with a portal selected                 | Animated drill-in                                                              |
| Pinch/ctrl+wheel until a portal fills the view                         | Auto drill-in (no animation, camera preserved)                                 |
| Escape, breadcrumb click, "Up", or zooming the root below 30% coverage | Drill-out (breadcrumb jumps several levels)                                    |
| Alt+← / Alt+→                                                          | Back / forward through a history of `{path, camera}` entries                   |
| Shift+1 / Shift+2 / Shift+0                                            | Fit scene / fit selection / reset zoom                                         |
| Double-click a text part of a node                                     | Edits it in place (§4 text parts); other openable nodes open (the ECHO object) |
| URL / deep link (phase 3)                                              | `{path, camera}` serialised so a location inside a nested scene is shareable   |

## 6b. Mobile navigation mode

_Written before decision 9 renamed cells: "cell" below means a node, and the `cells:`/`cell:` aspect names stay as spelled._

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

1. **Grid**: the existing multi-resolution SVG `GridComponent` fed `{scale: zoom, offset: camera × zoom}`,
   always shown. It draws a minor grid (`DEFAULT_GRID`, 16 px at zoom 1), a major grid every
   `MAJOR_GRID_RATIO` (4) minor lines and a coarse level 4 major cells wide, dropping a level once its cells
   fall under 6 screen px as the view zooms out. `g` and the Snap button toggle snapping only. **Snapping
   is to the major grid** (`MAJOR_GRID`, 64 scene px): moves and resizes snap edges to it, arrow nudges step by
   it, the derived scene bounds grow outward to it, and the fixture and the solver / layout defaults (pitch,
   size, origin) are multiples of it, so an untouched layout is already snapped and the frame sits on lines.
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
| Wheel                      | Pan. Ctrl/cmd+wheel (trackpad pinch) zooms about the cursor. Touch pinch zooms about the midpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Space+drag, hand tool      | Pan. Drag on background in `select` = marquee (intersection); shift adds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Click / shift-click        | Select / toggle; cmd+A selects all. Hit testing from the model in scene coordinates, never `getClientRects`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Drag selected nodes        | Transient offset atom, snapped in scene coordinates; on pointer-up one `move` intent (the undo unit). The projection decides what that means (§3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Control frame**          | Shown for the selection: outline, eight resize handles (`resize` intent, respects `NodeDef.minSize`). Ports show on the hovered and selected nodes, and on every node with a link tool. Hover is a model hit test with a port-sized margin, not the node element's enter/leave, so it survives the pointer crossing onto a port on the frame edge.                                                                                                                                                                                                                                                                                                                                                                |
| Drag from a port           | Rubber band; drop on a node pins the target to the port nearest the pointer (the candidate port fills while hovering; ports also fill on hover as drag sources), drop on empty canvas creates a rectangle and links to it (canvas-editor behaviour). The link's type is the active link tool's, or the last one picked under `select`. Emits a `link` intent carrying the whole link.                                                                                                                                                                                                                                                                                                                             |
| Drag a link end            | Re-attach; onto a port pins, onto a body unpins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Palette                    | Two groups generated from the registries: node types (R rectangle, E ellipse, C class, T text, S scene) and link types (L line, K curve, P spline). A node tool then click or drag on the canvas emits `create` (a click places the type's default size at the click). A link tool shows every port; dragging one creates that type.                                                                                                                                                                                                                                                                                                                                                                              |
| Click a link / its handles | Links are selectable (a wide transparent twin of the stroke takes the press) and deletable. A selected link shows its two end handles: dragging one re-attaches that end: over a node the link is drawn re-attached to the port nearest the pointer, over free space only the rubber band shows, and dropping on nothing leaves the link unchanged. A selected spline also shows diamond handles on its control points: click selects one (Delete or the right-click menu's "Remove control point" removes it), drag moves it, double-click on the stroke inserts one at the nearest segment, alt-click removes; all `update` intents. A spline leaves and enters its ports along the side normals, like a curve. |
| Keys                       | Arrows nudge (shift ×10), Delete, Escape, navigation keys from §6; via the attention-scoped hotkeys used by canvas-editor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| External drag-in           | pragmatic-dnd drop target only; internal gestures are pointer-driven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cut / copy / paste         | Per-view clipboard (`clipboard.ts`) of the selected nodes and the links between them. Paste mints fresh ids, rewires the links, offsets one grid step further per paste (or lands at the pointer from the canvas menu) and applies as one `batch` intent, so it is one undo step. ⌘X / ⌘C / ⌘V, toolbar buttons, and a right-click menu: Cut / Copy / Delete on an element, Paste on the canvas, Remove control point on a spline point.                                                                                                                                                                                                                                                                          |
| Undo                       | Per-view log of projection snapshots (`undo.ts`): every `apply` that changes the model pushes the snapshot taken before it, so the undo unit is the intent whatever the projection made of it; each projection takes and restores its own opaque snapshot (freehand: the scene, constrained: the constraint model, dynamic: graph plus overlay). ⌘Z / ⇧⌘Z and the Undo / Redo toolbar buttons; a log belongs to one scene and empties on drill. ECHO history later.                                                                                                                                                                                                                                               |

## 9. Package layout

```
packages/plugins/plugin-canvas/src/            (phase 3: the illustrator drawing variant `dxos.org/scene/1`)
  model/content.ts  Drawing.Canvas.content encoding: one record per scene, node and link; readScenes / writeScenes
  model/handler.ts  SceneHandler: illustrator DSL objects ↔ root-scene nodes and links (identity on the records)
  model/store.ts    bindCanvasStore: SceneStore ↔ canvas records inside Obj.update; createCanvas
  containers/       CanvasArticle: SceneView over the bound store
  capabilities/     DrawingVariant (IllustratorCapabilities.VariantProvider), Translations

packages/ui/react-ui-canvas/src/
  index.ts                 the pre-engine canvas (`./archive`), kept for canvas-editor / canvas-compute / sequencer until phase 4
  scene.ts                 the engine's barrel, exported as `@dxos/react-ui-canvas/scene` until it replaces the root export
  archive/                 old Canvas, CellGrid, FPS, hooks and svg utils, untouched; `Grid` wraps the engine's GridComponent
  (the engine, phase 2+ files marked †)
    model/                 what a scene is and how it changes
      types.ts             Schema: Scene {nodes, links}, Node (rect/ellipse/class/text/scene), NodeStyle, Link (line/curve/spline), Endpoint, Port, Camera, Intent, Tool
      registry.ts          NodeDef / LinkDef registries (name, icon, key, component, portsPerSide, ports, resizable, minSize, openable) + defaults
      projection.ts        Projection seam, reduceIntent (freehand reducer), createFreehandProjection
      projections/
        constrained.ts     cardinal constraints → longest-path ranks per axis (Layout.rank); a move rewrites them
        dynamic.ts         GraphModel → ranked rows + Overlay position overrides; link adds an edge
      store.ts             SceneStore seam, createMemoryStore, updateScene / putScene
      atoms.ts             per-view atoms: camera, path, selection, hover, point, tool, snap, drag, history, undo, clipboard, editing
    utils/                 pure functions over the model
      shapes.ts            per-type geometry: nodeBounds, resizeNode, DEFAULT_SIZES, createNode, createLink
      camera.ts            zoomAt, panBy, fitBounds, portalFrame, enterPortal / exitPortal, coverage, animateCamera
      hit.ts               derived sceneBounds, hitTest, nodesIntersecting, bounds helpers
      ports.ts             sidePorts, nodePorts, portPoint (grid-snapped), sideNormal, pairPorts (automatic pairing)
      route.ts             linePath, curvePath, splinePath (Catmull-Rom), linkPath by type, insertIndex; ortho later †
      order.ts             fractional z keys: between, sortByZ, topZ, initialKeys
      parts.ts             text parts of a node: partText, partValues, isMultiline
      style.ts             NodeStyle → frame classes (hue fill / text / border, rounded)
      clipboard.ts         copySelection, pasteFragment (fresh ids, rewired links, one batch intent)
      undo.ts              per-view snapshot log over the projection: withUndo, undo, redo
      builder.ts           SceneBuilder: chainable scene DSL (rect / ellipse / class / text / portal, line / curve / spline, `a#e2` port refs)
      testing.ts           createSceneTree fixture: root diagram plus flow / model / cycle / note child scenes (not exported)
    hooks/                 useRegistry, useSceneProjection, useViewport, useWheel
    components/            one folder per component, with its stories
      SceneView/           root view: grid, camera, pointer state machine, keys, drill-in/out, snap, toolbar, menus; SceneView / Constrained / Dynamic stories
      SceneLayer/          one scene under one transform: node views, link svg, portal tiers, nested live layer
      ControlFrame/        selection outline, resize handles, ports, link end and spline handles, marquee, rubber band
      PartEditor/          TextPart: static text or the in-place react-ui-editor over a node's text part
      Properties/          schema-driven form over the selected node or link (update intent)
      Palette/, Breadcrumbs/, Grid/
    *.test.ts              beside every pure module and projection
  MIGRATION.md (docs)      feature map of canvas-editor / canvas-compute against the engine, decisions, migration plan
  aspects.ts †             Aspect projections + reading order (§6b)
  columns/ †               ColumnStrip, Column, CellRow, AspectTabs (§6b)
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
