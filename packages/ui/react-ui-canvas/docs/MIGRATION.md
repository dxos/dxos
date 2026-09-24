# Migrating canvas-editor and canvas-compute to the scene engine

Status: gap analysis and plan (2026-09-20). Inputs: `DESIGN.md` (the engine), the source of
`packages/ui/react-ui-canvas-editor` and `packages/ui/react-ui-canvas-compute` on `main`, and their consumers
(`plugin-conductor`, `plugin-debug`). Every feature the two packages implement is mapped to what the engine has
today, what it needs, and which phase supplies it.

## 1. What the two packages are

- **canvas-editor** is a shape editor over a `CanvasBoard` ECHO object: `layout: GraphModel.Data` holds
  `Shape` nodes (`Polygon {center, size}` for `rectangle` / `ellipse` / `note`, `PathShape {path, start?, end?}`
  for drawn paths) and `Connection` edges (`{source, target, input?, output?}`). A `ShapeRegistry` of
  `ShapeDef {type, name, icon, component, createShape, getAnchors?, resizable?, openable?}` drives rendering and
  the tool palette; anchors are `{id, shape, pos}` per shape, `n/s/e/w` by default. Interaction is
  pragmatic-drag-and-drop for move, resize, anchor linking and palette drops; a custom wheel/pointer camera;
  shift-marquee; a `useActionHandler` vocabulary (`select`, `create`, `link`, `delete`, `cut/copy/paste`,
  `zoom-*`, `home`, `center`, `layout`, `grid`, `grid-snap`, `debug`, `trigger`, `undo`/`redo` as stubs); meta+key
  shortcuts scoped by attention; an `@antv/layout` auto-layout; and a "bullet" animation that runs a dot along an
  edge path.
- **canvas-compute** adds ~30 `ComputeShape`s (`Polygon & {node?: computeNodeId}`) whose components render the
  runtime state of a `@dxos/conductor` compute node, a `ComputeGraphController` that executes the graph and
  emits `update` / `output` / trace events, `useComputeNodeState(shape)` for the components, a `GraphMonitor`
  that mirrors canvas edits into the compute graph (create → compute node, link → compute edge, delete → both),
  and `ComputeShapeLayout`, which replaces a shape's static anchors with `input.<prop>` / `output.<prop>` anchors
  derived from the node's runtime JSON schema.
- **Consumers**: `plugin-conductor` (`CanvasArticle`: `Editor.Root` + `Editor.Canvas` + `Editor.UI showTools`,
  wraps the live ECHO layout with `CanvasGraphModel.create(layout, fn => Obj.update(...))` and re-syncs on
  `Obj.subscribe`; schema registration and create-object for `CanvasBoard`; surfaced to users as "Circuit"),
  `plugin-debug` (seeded circuit presets built from the shape factories), the app-framework package allowlist and
  Composer's `optimizeDeps` entries for `@antv/*` and `flubber`.

## 2. Feature map

Legend: **✓** the engine has it; **≈** the engine has the mechanism and the feature is a thin addition;
**✗** missing, the plan below supplies it. Phase numbers refer to `DESIGN.md` §10 plus the migration phases in §4
of this document.

### 2.1 Data model

| canvas-editor / compute                                          | Engine                                                                                                        | Status | Plan                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Polygon {center, size}` shapes                                  | `NodeBase` with `center` + `size` on every node, plus per-type properties                                     | ✓      |                                                                                                                                    |
| `type: string` open shape type                                   | `Node` is the open `NodeBase`; a host registers its types with their schema and `createSceneSchema`           | ✓      | M1 (decision 1)                                                                                                                    |
| `Connection {source, target, input?, output?}`                   | `Link {source: {node, port?}, target: {node, port?}}`; `input`/`output` are the two port ids                  | ✓      |                                                                                                                                    |
| `PathShape {path, start?, end?}` (stored SVG string, markers)    | `ends?: {start?, end?}` markers on every link; a free path is a spline whose ends are `{point}` endpoints     | ✓      | M2 (decision 3)                                                                                                                    |
| `guide: boolean`, `classNames`                                   | `NodeStyle.guide` (dashed, unfilled) and `NodeStyle.className`, rendered by the frame                         | ✓      | M2                                                                                                                                 |
| `text` on every shape                                            | `label` (rect, ellipse), `text` (text), `name` (class)                                                        | ≈      | keep per type; the migration maps `text` to the type's field                                                                       |
| `rounded?` on rectangle                                          | none (declared but unused upstream)                                                                           | ✗      | drop                                                                                                                               |
| `ComputeShape.node` (compute node id)                            | each compute shape schema plus `z` is a node schema (`scene/defs.ts`); the projection writes `node` on create | ✓      | M3                                                                                                                                 |
| `CanvasBoard {name, computeGraph: Ref, layout: GraphModel.Data}` | in-memory `SceneStore`; ECHO store is phase 3 (`Drawing.Canvas.content` via `@dxos/diagram` builders)         | ✗      | M4: a `SceneStore` over `CanvasBoard.layout` first (keeps the ECHO type and every existing board), phase 3's `Drawing` store later |
| Fractional `z`                                                   | ✓ on nodes and links                                                                                          | ✓      | editor has no z; migration assigns `initialKeys` in array order                                                                    |
| Ids                                                              | `ElementId` shared namespace; editor uses `Obj.ID.random()`                                                   | ✓      |                                                                                                                                    |

### 2.2 Shapes and anchors

| canvas-editor / compute                                                                                                                          | Engine                                                                                                                                                                  | Status | Plan                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `rectangle`, `ellipse`, `note`                                                                                                                   | `rect`, `ellipse`, `text` (note = text with a surface style)                                                                                                            | ✓      |                                                                                     |
| `ShapeDef {type, name, icon, component, createShape, getAnchors, resizable, openable}`                                                           | `NodeDef {type, name, icon, key, component, ports, resizable, minSize, openable}` + `createNode`                                                                        | ✓      | `key` is new (palette shortcut)                                                     |
| `ShapeDefSet` groups for the palette                                                                                                             | `NodeDef.group`: compute's Inputs / Transform / Operations / Outputs / Misc groups (`computeNodeDefs`)                                                                  | ✓      | M1, M3                                                                              |
| Anchors `n/s/e/w` by unit vector                                                                                                                 | `Port {id, side, offset}` on the frame                                                                                                                                  | ✓      |                                                                                     |
| Function anchors: inputs stacked on the left, outputs on the right, one per schema property at `rowHeight` pitch, ids `input.<p>` / `output.<p>` | `anchorsToPorts` over each def's `getAnchors` (`NodeDef.ports`), `snap: false` keeps the row pitch; the compute projection writes `node.ports` from the runtime schemas | ✓      | M3                                                                                  |
| `Anchor.type` (direction) and `canDrop` rules (input↔output only, no self)                                                                       | `Port.accepts?: 'in' \| 'out' \| 'any'`; `pairPorts` and the drop target honour it                                                                                      | ✓      | M1 (decision 2)                                                                     |
| Anchor `pos` in shape-relative px (not a side offset)                                                                                            | ports are side + 0..1 offset; `anchorsToPorts` picks the nearer edge and keeps the exact offset                                                                         | ✓      | M3                                                                                  |
| `Box` chrome: header (icon, name, run ▶), body, footer (status, open/close caret)                                                                | `Box` unchanged inside the node component, its def from `ComputeContext.registry`                                                                                       | ✓      | M3                                                                                  |
| `FunctionBody` open/close grows the DOM element's height                                                                                         | `ComputeContext.resize` → `update {size}` in the engine; the editor path still stretches the element                                                                    | ✓      | M3                                                                                  |
| Shape-specific inputs (`TextBox`, `TypeSelect`, `Field.Switch`, `Select`)                                                                        | the component decides; `Properties` panel is schema-driven                                                                                                              | ✓      | components move verbatim                                                            |
| `Surface` shape (`Surface.Surface type=CardContent data={{subject}}`)                                                                            | `object` node type is designed (§4) but not built                                                                                                                       | ✗      | phase 2 `object` node + M3 `compute` node both host `Surface`                       |
| `note` text editing (`TextBox`, Enter commits, Esc cancels)                                                                                      | `text` node is read-only; `openable` reserved for it                                                                                                                    | ✗      | phase 2: inline editing via `openable` → an `editing` view atom and `update {text}` |
| `table` shape (defined, unregistered)                                                                                                            | n/a                                                                                                                                                                     |        | drop                                                                                |

### 2.3 Rendering

| canvas-editor                                                      | Engine                                                                                                     | Status | Plan                                                                                                             |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| One CSS transform on a container; centre-based absolute shapes     | same (decision 7)                                                                                          | ✓      |                                                                                                                  |
| SVG `defs` with arrow / circle markers                             | `Markers` in the link SVG; `ends?` (or `directed`) selects them                                            | ✓      | M2                                                                                                               |
| Grid (`react-ui-canvas` `Grid`), toggle, axes                      | same component, major/minor grid, `g` toggle                                                               | ✓      |                                                                                                                  |
| Selection / hover / active frame styles, `top` z-bump              | selection outline and border, hover border, selection painted on top (paint order, not the model)          | ✓      | M2                                                                                                               |
| Preview shape while dragging from the palette                      | the type's own view as a translucent ghost, for a create drag and a palette drop alike                     | ✓      | M2                                                                                                               |
| Debug mode (id / type / coordinates in the frame, JSON panel, FPS) | `debug` view atom (`D`, toolbar): id / type / geometry / z label on every frame; stories carry JSON panels | ✓      | M2                                                                                                               |
| `ready` gating until the first measurement                         | `measured` gating in a layout effect                                                                       | ✓      |                                                                                                                  |
| Bullets: animated dot along an edge path (`fireBullet`, propagate) | none                                                                                                       | ✗      | M3: `LinkLayer` exposes the path elements by link id; `bullets.ts` moves to canvas-compute and runs against them |
| Nested scenes, portals, tiers, drill                               | ✓ (not in the editor)                                                                                      | ✓      |                                                                                                                  |

### 2.4 Interaction

| canvas-editor                                                                                                                       | Engine                                                                                                                                                       | Status | Plan                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Pan (drag on empty, wheel), ctrl-wheel zoom about the pointer                                                                       | ✓ (plus pinch, hand tool, middle button)                                                                                                                     | ✓      |                                                                                                                         |
| Marquee (shift + drag on empty; alt subtracts; contains, not intersects)                                                            | drag on empty is marquee; shift adds, alt subtracts; intersects (tldraw semantics)                                                                           | ✓      | M2                                                                                                                      |
| Click / shift-click select; edges selectable                                                                                        | ✓ nodes and links; shift toggles                                                                                                                             | ✓      |                                                                                                                         |
| Double-click shows resize handles                                                                                                   | handles show on single selection; double-click opens (`openable`)                                                                                            | ✓      |                                                                                                                         |
| Move via pdnd with snapped drop                                                                                                     | pointer machine, snapped transiently, one `move` intent                                                                                                      | ✓      |                                                                                                                         |
| Resize via anchors (min 128, max 960, shift = symmetric)                                                                            | 8 handles, `minSize` / `maxSize` per type, shift = symmetric (`resize.ts`)                                                                                   | ✓      | M2                                                                                                                      |
| Link from anchor: nearest valid anchor within 32 units, live curve, drop on frame (rectangles only) or canvas (creates a rectangle) | ✓ ports show on ⌘-hover (or with a link tool), port snap 16 px, drop on body = automatic port, drop on canvas creates a rectangle                            | ✓      | M1 (decision 2): `Port.accepts` decides what a drop lands on                                                            |
| Palette: drag a shape onto the canvas                                                                                               | palette picks a tool; click or drag on the canvas creates; a palette entry (or any pdnd source carrying `nodeDragData`) drops onto the canvas with a ghost   | ✓      | M2                                                                                                                      |
| Toolbar: grid, snap, center, zoom in/out, layout select + run, zoom-to-fit, delete (shift = all), create, trigger                   | optional `Toolbar` (decision 5): up / breadcrumbs, fit, zoom in/out, snap, undo/redo, cut/copy/paste/delete, create menu, layout (disabled until M4), debug  | ✓      | M2; layout runs in M4, trigger is compute's (M3)                                                                        |
| Shortcuts: meta+z/shift+meta+z (no-op), meta+x/c/v, Backspace/Delete, Escape, d, meta+a, meta+', Home                               | Escape, Delete/Backspace, ⌘A, ⌘X/C/V, ⌘Z/⇧⌘Z, arrows nudge, Shift+1/2/0, Home, Alt+←/→, G, D, tool keys; one table (`model/keys.ts`) the toolbar labels read | ✓      | M2                                                                                                                      |
| Attention-scoped hotkeys (`useHotkeys`, `KeyboardContainer`)                                                                        | `onKeyDown` on the focused root                                                                                                                              | ≈      | M4: the plugin container wires `@dxos/react-focus` scopes around the view                                               |
| Cut / copy / paste (ids not regenerated)                                                                                            | ✓ per-view clipboard, fresh ids, links rewired, one `batch` intent (one undo step); ⌘X / ⌘C / ⌘V, toolbar, context menu                                      | ✓      |                                                                                                                         |
| Undo / redo                                                                                                                         | ✓ per-view snapshot log over the projection seam, ⌘Z / ⇧⌘Z, toolbar buttons (upstream has stubs only)                                                        | ✓      |                                                                                                                         |
| Delete all                                                                                                                          | select all + Delete                                                                                                                                          | ✓      |                                                                                                                         |
| Auto layout (`@antv/layout`: force, circular, radial, grid)                                                                         | `Layout.rank` rows in the constrained / dynamic projections                                                                                                  | ≈      | M4: a `layout` intent handled by the projection; freehand uses `@dxos/diagram` engines (dagre / ELK) instead of `@antv` |
| Inline text editing                                                                                                                 | none                                                                                                                                                         | ✗      | phase 2 (see 2.2)                                                                                                       |
| Context menus                                                                                                                       | ✓ right-click: Cut / Copy / Delete on an element, Paste on the canvas, Remove control point                                                                  | ✓      | upstream has none                                                                                                       |
| Touch                                                                                                                               | pointer events + `touch-none`; pinch zoom                                                                                                                    | ✓      | better than upstream (pdnd has no touch)                                                                                |
| Drag out of the window loses the drop (upstream TODO)                                                                               | pointer capture keeps the drag                                                                                                                               | ✓      |                                                                                                                         |

### 2.5 Compute integration

| canvas-compute                                                                            | Engine                                                                                                                                                                                                        | Status | Plan                                                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `GraphMonitor {onCreate, onLink, onDelete}` mirroring canvas → compute graph              | `createComputeProjection({controller})` (`scene/projection.ts`): `create` / `link` / `delete` reach the compute graph through the shared `graph/sync.ts`, which `useGraphMonitor` uses too                    | ✓      | M3                                                                               |
| `ComputeShapeLayout`: anchors from runtime schema                                         | the projection writes `node.ports` from the compute node's input / output schemas (`anchorsToPorts` over `createFunctionAnchors`); static ports come from each def's `getAnchors`                             | ✓      | M3                                                                               |
| `useComputeNodeState(shape)` → `{node, meta, runtime}`                                    | unchanged: the engine node is the shape plus `z`, so every component renders verbatim under `computeNodeView`                                                                                                 | ✓      | M3                                                                               |
| `ComputeContext` / `useComputeGraphController` (repaint on `update`, bullets on `output`) | `useControllerUpdates` re-renders each node view on `update`; `Bullets` (a `SceneView` overlay) runs a dot along the link path on `output`; `ComputeContext` carries the shape registry, `debug` and `resize` | ✓      | M3                                                                               |
| `AUTO_TRIGGER_NODES`, `exec`, `evalNode`, `setOutput`, diagnostics                        | controller is untouched by the migration                                                                                                                                                                      | ✓      | none                                                                             |
| `DiagnosticOverlay`                                                                       | rendered over the view as before                                                                                                                                                                              | ✓      | M3                                                                               |
| Trigger shape rewrites its own `size.height` on kind change                               | still a direct write; the engine node is the store's value                                                                                                                                                    | ≈      | M4: an `update {size}` intent through the projection                             |
| `createComputeGraph(canvasGraph)` and the `testing/circuits.ts` factories                 | unchanged; `sceneFromCircuit` turns a circuit into a scene (notes become note nodes, edges pin the property ports)                                                                                            | ✓      | M3; M4 replaces `sceneFromCircuit` with the ECHO store over `CanvasBoard.layout` |
| `Box` reads the shape def and `debug` from the editor context                             | `ComputeContext.registry` / `debug` on both surfaces; a function body grows through `resize` (an `update {size}` in the engine) or the frame element in the editor                                            | ✓      | M3                                                                               |

### 2.6 Persistence and collaboration

| canvas-editor                                                                         | Engine                                             | Status | Plan                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CanvasGraphModel.create(layout, fn => Obj.update(...))`, `sync()` on `Obj.subscribe` | `SceneStore` seam with an in-memory implementation | ✗      | M4: `createEchoStore(board)`: `scenes` atom derived from `Obj.subscribe`, `updateScene` under `Obj.update`; nodes/links map 1:1 onto `layout.nodes` / `layout.edges` |
| Direct field writes outside the change function (drop, text, layout, trigger)         | every write is an intent through the projection    | ✓      | the migration removes the bypasses                                                                                                                                   |
| Nested-record ownership (`structuredClone` of `inputSchema`)                          | store-level concern                                |        | M4 keeps the clone in the compute projection                                                                                                                         |
| No presence / awareness                                                               | none                                               |        | out of scope                                                                                                                                                         |

### 2.7 Testing and stories

| canvas-editor / compute                                   | Engine                                                                                  | Plan                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `resizeAxis` unit tests                                   | `resize.test.ts` (snap, min, max, symmetric)                                            | ✓ M2                                                                  |
| Editor stories (Default, Dragging, Query), Frame, TextBox | Freehand, Nested, Constrained, Dynamic, Toolbar                                         | ✓ M2; M3: the compute circuits as stories over the compute projection |
| `createComputeGraph.test.ts` (11 circuits, ownership)     | n/a                                                                                     | M3: same tests over the compute projection                            |
| No E2E                                                    | `src/playwright/scene.spec.ts` over the Freehand story (`moon run react-ui-canvas:e2e`) | ✓ M2                                                                  |

## 3. Design decisions (settled 2026-09-20)

1. **Open shape types → host-composed union.** Each `NodeDef` carries its own Effect schema and the host builds the
   scene schema as `Schema.Union(defs.map((def) => def.schema))`; the engine is generic over that union, so the
   properties panel and the ECHO type stay exact for every host type. This is what compute already does with
   `ComputeShape.mapFields`. No `extension` escape hatch.
2. **Port direction → both.** `Port.accepts?: 'in' | 'out' | 'any'` (default `any`) validates at drop time and lets
   the router prefer a matching pair; `Link.directed?: boolean` renders the arrowhead. Undirected diagrams change
   nothing.
3. **Free paths and markers → free endpoints on links.** `Endpoint = { node, port? } | { point }`, so a link (spline
   in practice) may start or end at a fixed point, with `ends` markers (`arrow`, `triangle`, `circle`, `none`) at
   either end; the markers double as the rendering of decision 2. No separate `path` node: one routing and hit
   testing path for everything.
4. **Auto layout → drop `@antv`.** Grid and layered layouts come from `@dxos/diagram` (dagre, ELK); force and
   radial from d3-force, or ELK's `stress` / `radial` where fidelity matters. `@antv/layout`, `@antv/graphlib` and
   `flubber` leave Composer's bundle.
5. **Palette and toolbar → the engine owns both, optionally.** `Palette` and the toolbar stay in
   `@dxos/react-ui-canvas/scene` as optional, registry-generated components (`showPalette`, `showToolbar`, slots);
   a host with thirty node types gets its palette for free and the plugin decides what to show.

## 4. Migration plan

Each step is one PR, lands green on its own, and keeps `plugin-conductor` working on the old packages until M4
switches it. Phases 1–3 of `DESIGN.md` §10 interleave: phase 2 (object nodes, undo, ortho) is not a prerequisite
for M1–M3.

- **M1: registry openness (engine)** — done. `NodeBase` (centre + size on every node; the ellipse's radii became
  its size), `Node` open to host types with `isRectNode`-style guards for the built-ins, `NodeDef.schema` /
  `create` / `defaultSize` / `group?` and `createSceneSchema` (decision 1); `Port.accepts?` in `pairPorts` and
  the drop target, `Link.directed` with an arrowhead (decision 2). Tests for both; the stories are unchanged.
- **M2: editor parity (engine)** — done. `{point}` endpoints and `ends` markers (decision 3), `guide` /
  `className` on `NodeStyle`, hover border and selection painted on top, the type's view as the ghost of a create
  drag and of a palette / pdnd drop, shift-symmetric resize and `maxSize` (`resize.ts`, unit-tested), alt-subtract
  marquee, `debug` atom, the optional `Toolbar` (decision 5; layout disabled until M4), `Home`, and a Playwright
  `e2e` suite over the Freehand story. Node style, cut / copy / paste, undo and in-place text editing landed in
  phase 1. The engine is now a superset of canvas-editor's UI minus auto layout.
- **M3: canvas-compute on the engine (compute package)** — done, additive: the editor path keeps working until M4.
  `scene/defs.ts` turns every `ShapeDef` into a `NodeDef` (the shape schema with `z`, the component under
  `computeNodeView`, ports from `getAnchors`, the palette groups); `createComputeProjection` mirrors `create` /
  `link` / `delete` and a re-attached link end into the compute graph through `graph/sync.ts` (shared with
  `useGraphMonitor`), reconciles the graph with a restored scene so undo / redo take the compute nodes and edges
  along, and writes runtime ports from the compute node's schemas; `Bullets` animates outputs along the link paths; `sceneFromCircuit` maps
  the circuit factories to scenes; `scene.test.ts` and the twelve `scene` stories over `SceneView`. The engine gained
  `Port.snap`, `data-link-id`, an `overlay` slot, a host-owned `projection` and keyless palette entries. The
  controller, `useComputeNodeState`, `node-defs.ts` and the conductor runtime are untouched.
- **M4: persistence and the plugin switch** — done. `createEchoStore(board)` over `CanvasBoard.layout` (nodes ↔
  `layout.nodes`, links ↔ `layout.edges`, z from array order, and back out in that order) so every existing board
  opens unchanged; writes reconcile element by element rather than rebuilding the arrays, since a drag would
  otherwise send one Automerge delta covering the whole board per frame. Three translations, no migration: z-order,
  a shape's `guide` / `classNames` ↔ a node's `style` (mirrored back so the old editor still reads them), and an
  edge's `input` / `output` property names ↔ a link endpoint's anchor-id port. A `layout` intent handled by the
  projection, ranking the scene into rows through `@dxos/diagram`'s `Layout.rank` — the engine the dynamic
  projection already uses — rather than dagre / ELK: `@antv` is dropped and, unlike it, every node keeps its type,
  size and content and only its centre moves. `Capabilities.layout` enables the toolbar's button.
  `plugin-conductor`'s `CanvasArticle` renders `SceneView` with the compute projection and the ECHO store, hotkey
  scope still wired by `KeyboardContainer`; Composer's `optimizeDeps` regenerated. `plugin-debug`'s presets are
  untouched **by design** — they write shapes into `layout` exactly as the editor did, which is what the store
  reads. canvas-editor and canvas-compute keep exporting until M5.
- **M5: retire.** Delete `react-ui-canvas-editor` and the old `react-ui-canvas` `Canvas` exports (DESIGN phase 4);
  `react-ui-canvas-compute` keeps only the compute-specific code (controller, projection, shapes, bullets). Text
  inline editing and undo (phase 2) are independent of this step but should precede the user-facing switch in M4
  if conductor's users rely on note editing; today `onEdit` is unreachable in the editor, so they do not.

Rough size: M1 small (types + tests), M2 medium (UI, the largest surface), M3 medium (mostly moves), M4 medium
(store + plugin), M5 small. Every step is verifiable with the existing stories plus one new story per step.
