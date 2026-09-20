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

| canvas-editor / compute                                          | Engine                                                                                                | Status | Plan                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Polygon {center, size}` shapes                                  | `Node` with `center` + per-type properties (`size`, or `rx`/`ry`)                                     | ✓      |                                                                                                                                                     |
| `type: string` open shape type                                   | `NodeType` closed union in the schema; the registry is keyed by it                                    | ≈      | M1: an `extension` node type carrying `subtype` + `data`, or a per-host schema union built from the registry                                        |
| `Connection {source, target, input?, output?}`                   | `Link {source: {node, port?}, target: {node, port?}}`; `input`/`output` are the two port ids          | ✓      |                                                                                                                                                     |
| `PathShape {path, start?, end?}` (stored SVG string, markers)    | `spline` link stores `points`, the path is derived; no free-standing path node; no markers            | ≈      | M2: `ends?: {start?: Marker, end?: Marker}` on `LinkBase`; free paths become a spline whose ends are fixed points (an `Endpoint` variant `{point}`) |
| `guide: boolean`, `classNames`                                   | none                                                                                                  | ✗      | M2: `style?` on `NodeBase`/`LinkBase` (guide, className) rendered by the frame                                                                      |
| `text` on every shape                                            | `label` (rect, ellipse), `text` (text), `name` (class)                                                | ≈      | keep per type; the migration maps `text` to the type's field                                                                                        |
| `rounded?` on rectangle                                          | none (declared but unused upstream)                                                                   | ✗      | drop                                                                                                                                                |
| `ComputeShape.node` (compute node id)                            | none                                                                                                  | ✗      | M3: `compute` node type `{size, node: computeNodeId}` in `react-ui-canvas-compute` via the registry hook of M1                                      |
| `CanvasBoard {name, computeGraph: Ref, layout: GraphModel.Data}` | in-memory `SceneStore`; ECHO store is phase 3 (`Drawing.Canvas.content` via `@dxos/diagram` builders) | ✗      | M4: a `SceneStore` over `CanvasBoard.layout` first (keeps the ECHO type and every existing board), phase 3's `Drawing` store later                  |
| Fractional `z`                                                   | ✓ on nodes and links                                                                                  | ✓      | editor has no z; migration assigns `initialKeys` in array order                                                                                     |
| Ids                                                              | `ElementId` shared namespace; editor uses `Obj.ID.random()`                                           | ✓      |                                                                                                                                                     |

### 2.2 Shapes and anchors

| canvas-editor / compute                                                                                                                          | Engine                                                                                           | Status | Plan                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rectangle`, `ellipse`, `note`                                                                                                                   | `rect`, `ellipse`, `text` (note = text with a surface style)                                     | ✓      |                                                                                                                                                                                                               |
| `ShapeDef {type, name, icon, component, createShape, getAnchors, resizable, openable}`                                                           | `NodeDef {type, name, icon, key, component, ports, resizable, minSize, openable}` + `createNode` | ✓      | `key` is new (palette shortcut)                                                                                                                                                                               |
| `ShapeDefSet` groups for the palette                                                                                                             | palette groups: fixed tools, node types, link types                                              | ≈      | M1: `NodeDef.group?` so compute's Inputs / Transform / Operations / Outputs groups survive                                                                                                                    |
| Anchors `n/s/e/w` by unit vector                                                                                                                 | `Port {id, side, offset}` on the frame                                                           | ✓      |                                                                                                                                                                                                               |
| Function anchors: inputs stacked on the left, outputs on the right, one per schema property at `rowHeight` pitch, ids `input.<p>` / `output.<p>` | `NodeDef.ports(node)` or `node.ports`                                                            | ≈      | M3: `computeNodeDef.ports(node)` builds `{id: 'input.<p>', side: 'w', offset: row(i)}` from the node's schema; `ComputeShapeLayout`'s runtime override becomes `node.ports` written by the compute projection |
| `Anchor.type` (direction) and `canDrop` rules (input↔output only, no self)                                                                       | `Port` has no direction                                                                          | ✗      | M3: `Port.accepts?: 'in' \| 'out' \| 'both'`; `pairPorts` and `linkTarget` honour it                                                                                                                          |
| Anchor `pos` in shape-relative px (not a side offset)                                                                                            | ports are side + 0..1 offset                                                                     | ≈      | sufficient for left/right stacks; a free-position port (`{x, y}` relative) can be added to `Port` if a shape needs it                                                                                         |
| `Box` chrome: header (icon, name, run ▶), body, footer (status, open/close caret)                                                                | none; the node component owns its whole body                                                     | ✗      | M3: `Box` moves into canvas-compute unchanged and renders inside the node component                                                                                                                           |
| `FunctionBody` open/close grows the DOM element's height                                                                                         | resize is a model intent                                                                         | ≈      | M3: open/close emits `resize` (or `update {size}`) so it persists and re-routes links                                                                                                                         |
| Shape-specific inputs (`TextBox`, `TypeSelect`, `Field.Switch`, `Select`)                                                                        | the component decides; `Properties` panel is schema-driven                                       | ✓      | components move verbatim                                                                                                                                                                                      |
| `Surface` shape (`Surface.Surface type=CardContent data={{subject}}`)                                                                            | `object` node type is designed (§4) but not built                                                | ✗      | phase 2 `object` node + M3 `compute` node both host `Surface`                                                                                                                                                 |
| `note` text editing (`TextBox`, Enter commits, Esc cancels)                                                                                      | `text` node is read-only; `openable` reserved for it                                             | ✗      | phase 2: inline editing via `openable` → an `editing` view atom and `update {text}`                                                                                                                           |
| `table` shape (defined, unregistered)                                                                                                            | n/a                                                                                              |        | drop                                                                                                                                                                                                          |

### 2.3 Rendering

| canvas-editor                                                      | Engine                                                    | Status | Plan                                                                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| One CSS transform on a container; centre-based absolute shapes     | same (decision 7)                                         | ✓      |                                                                                                                  |
| SVG `defs` with arrow / circle markers                             | none                                                      | ✗      | M2: `Markers` in the link SVG; `ends?` on links select them                                                      |
| Grid (`react-ui-canvas` `Grid`), toggle, axes                      | same component, major/minor grid, `g` toggle              | ✓      |                                                                                                                  |
| Selection / hover / active frame styles, `top` z-bump              | selection outline in the control frame; hover shows ports | ≈      | M2: hover border, selected-on-top (a transient z in the layer, not the model)                                    |
| Preview shape while dragging from the palette                      | `create` drag draws a dashed rect                         | ≈      | M2: render the type's component ghost instead of a rect                                                          |
| Debug mode (id / type / coordinates in the frame, JSON panel, FPS) | zoom / pointer / depth readout; stories carry JSON panels | ≈      | M2: a `debug` view atom the frame reads                                                                          |
| `ready` gating until the first measurement                         | `measured` gating in a layout effect                      | ✓      |                                                                                                                  |
| Bullets: animated dot along an edge path (`fireBullet`, propagate) | none                                                      | ✗      | M3: `LinkLayer` exposes the path elements by link id; `bullets.ts` moves to canvas-compute and runs against them |
| Nested scenes, portals, tiers, drill                               | ✓ (not in the editor)                                     | ✓      |                                                                                                                  |

### 2.4 Interaction

| canvas-editor                                                                                                                       | Engine                                                                                                                  | Status | Plan                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Pan (drag on empty, wheel), ctrl-wheel zoom about the pointer                                                                       | ✓ (plus pinch, hand tool, middle button)                                                                                | ✓      |                                                                                                                         |
| Marquee (shift + drag on empty; alt subtracts; contains, not intersects)                                                            | drag on empty is marquee; shift adds; intersects                                                                        | ≈      | M2: alt subtracts; keep intersection (tldraw semantics) unless the user objects                                         |
| Click / shift-click select; edges selectable                                                                                        | ✓ nodes and links; shift toggles                                                                                        | ✓      |                                                                                                                         |
| Double-click shows resize handles                                                                                                   | handles show on single selection; double-click opens (`openable`)                                                       | ✓      |                                                                                                                         |
| Move via pdnd with snapped drop                                                                                                     | pointer machine, snapped transiently, one `move` intent                                                                 | ✓      |                                                                                                                         |
| Resize via anchors (min 128, max 960, shift = symmetric)                                                                            | 8 handles, `minSize` per type, no max, no symmetric                                                                     | ≈      | M2: shift-symmetric and `maxSize` in `resizeBounds`                                                                     |
| Link from anchor: nearest valid anchor within 32 units, live curve, drop on frame (rectangles only) or canvas (creates a rectangle) | ✓ port snap 16 px, drop on body = automatic port, drop on canvas creates a rectangle                                    | ✓      | M3 adds the direction rule                                                                                              |
| Palette: drag a shape onto the canvas                                                                                               | palette picks a tool; click or drag on the canvas creates                                                               | ≈      | M2: also accept a palette drag-drop (pragmatic-dnd drop target, DESIGN §8 "external drag-in")                           |
| Toolbar: grid, snap, center, zoom in/out, layout select + run, zoom-to-fit, delete (shift = all), create, trigger                   | Fit, Grid, Up, breadcrumbs, palette; Shift+1/2/0 keys                                                                   | ≈      | M2: `Toolbar` component over the same actions; layout and trigger are M3/M4                                             |
| Shortcuts: meta+z/shift+meta+z (no-op), meta+x/c/v, Backspace/Delete, Escape, d, meta+a, meta+', Home                               | Escape, Delete/Backspace, cmd+A, arrows nudge, Shift+1/2/0, Alt+←/→, g, tool keys                                       | ≈      | M2: cut/copy/paste, Home; undo is phase 2's intent log                                                                  |
| Attention-scoped hotkeys (`useHotkeys`, `KeyboardContainer`)                                                                        | `onKeyDown` on the focused root                                                                                         | ≈      | M4: the plugin container wires `@dxos/react-focus` scopes around the view                                               |
| Cut / copy / paste (ids not regenerated)                                                                                            | ✓ per-view clipboard, fresh ids, links rewired, one `batch` intent (one undo step); ⌘X / ⌘C / ⌘V, toolbar, context menu | ✓      |                                                                                                                         |
| Undo / redo                                                                                                                         | ✓ per-view snapshot log over the projection seam, ⌘Z / ⇧⌘Z, toolbar buttons (upstream has stubs only)                   | ✓      |                                                                                                                         |
| Delete all                                                                                                                          | select all + Delete                                                                                                     | ✓      |                                                                                                                         |
| Auto layout (`@antv/layout`: force, circular, radial, grid)                                                                         | `Layout.rank` rows in the constrained / dynamic projections                                                             | ≈      | M4: a `layout` intent handled by the projection; freehand uses `@dxos/diagram` engines (dagre / ELK) instead of `@antv` |
| Inline text editing                                                                                                                 | none                                                                                                                    | ✗      | phase 2 (see 2.2)                                                                                                       |
| Context menus                                                                                                                       | ✓ right-click: Cut / Copy / Delete on an element, Paste on the canvas, Remove control point                             | ✓      | upstream has none                                                                                                       |
| Touch                                                                                                                               | pointer events + `touch-none`; pinch zoom                                                                               | ✓      | better than upstream (pdnd has no touch)                                                                                |
| Drag out of the window loses the drop (upstream TODO)                                                                               | pointer capture keeps the drag                                                                                          | ✓      |                                                                                                                         |

### 2.5 Compute integration

| canvas-compute                                                                            | Engine                                                                                              | Status | Plan                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `GraphMonitor {onCreate, onLink, onDelete}` mirroring canvas → compute graph              | the projection seam: a projection that owns both the layout and the compute graph sees every intent | ✓      | M3: `createComputeProjection({board, controller})` applies `create` / `link` / `delete` to both, exactly what `useGraphMonitor` does today |
| `ComputeShapeLayout`: anchors from runtime schema                                         | `node.ports`                                                                                        | ≈      | M3: the compute projection writes `ports` from `controller.getMeta(node)`                                                                  |
| `useComputeNodeState(shape)` → `{node, meta, runtime}`                                    | node components receive `node`; a context supplies the controller                                   | ✓      | hook moves verbatim, keyed by `node.node`                                                                                                  |
| `ComputeContext` / `useComputeGraphController` (repaint on `update`, bullets on `output`) | atoms re-render on change; bullets per 2.3                                                          | ≈      | M3                                                                                                                                         |
| `AUTO_TRIGGER_NODES`, `exec`, `evalNode`, `setOutput`, diagnostics                        | controller is untouched by the migration                                                            | ✓      | none                                                                                                                                       |
| `DiagnosticOverlay`                                                                       | overlay layer in scene coordinates                                                                  | ≈      | M3: render into the control frame's SVG or a sibling                                                                                       |
| Trigger shape rewrites its own `size.height` on kind change                               | `resize` / `update` intent                                                                          | ≈      | M3                                                                                                                                         |
| `createComputeGraph(canvasGraph)` and the `testing/circuits.ts` factories                 | `createNode` / `createLink` + a `compute` node type                                                 | ≈      | M3: factories emit engine nodes; `plugin-debug` presets follow                                                                             |

### 2.6 Persistence and collaboration

| canvas-editor                                                                         | Engine                                             | Status | Plan                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CanvasGraphModel.create(layout, fn => Obj.update(...))`, `sync()` on `Obj.subscribe` | `SceneStore` seam with an in-memory implementation | ✗      | M4: `createEchoStore(board)`: `scenes` atom derived from `Obj.subscribe`, `updateScene` under `Obj.update`; nodes/links map 1:1 onto `layout.nodes` / `layout.edges` |
| Direct field writes outside the change function (drop, text, layout, trigger)         | every write is an intent through the projection    | ✓      | the migration removes the bypasses                                                                                                                                   |
| Nested-record ownership (`structuredClone` of `inputSchema`)                          | store-level concern                                |        | M4 keeps the clone in the compute projection                                                                                                                         |
| No presence / awareness                                                               | none                                               |        | out of scope                                                                                                                                                         |

### 2.7 Testing and stories

| canvas-editor / compute                                   | Engine                                                | Plan                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `resizeAxis` unit tests                                   | `resizeBounds` is covered by the snap smoke test only | M2: unit tests for `resizeBounds` (min, symmetric, max)                                |
| Editor stories (Default, Dragging, Query), Frame, TextBox | Freehand, Nested, Constrained, Dynamic                | M2: a `Toolbar` story; M3: the compute circuits as stories over the compute projection |
| `createComputeGraph.test.ts` (11 circuits, ownership)     | n/a                                                   | M3: same tests over the compute projection                                             |
| No E2E                                                    | Playwright smoke scripts (not yet in CI)              | M2: promote the smoke scripts to `e2e`                                                 |

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

- **M1: registry openness (engine).** Host-composed node schema union (decision 1 above), `NodeDef.group?` for
  palette groups, `Port.accepts?` and its use in `pairPorts` / `linkTarget` (decision 2). Tests for both.
  Unblocks canvas-compute without changing any behaviour of the stories.
- **M2: editor parity (engine).** Link `ends` markers and `{point}` endpoints (decision 3); `Link.directed`;
  `guide` / `className` on the existing `NodeStyle`; hover border and selected-on-top; ghost preview for palette
  drags and a pdnd drop target for palette / external drops; shift-symmetric resize and `maxSize`; alt-subtract
  marquee; `debug` atom; the toolbar as an optional `Toolbar` component with zoom in/out, delete, create and a
  layout placeholder (decision 5); `Home`; `resizeBounds` unit tests; the smoke scripts promoted to `e2e`. Node
  style, cut / copy / paste, undo and in-place text editing already landed in phase 1. After M2 the engine is a
  superset of canvas-editor's UI minus auto layout.
- **M3: canvas-compute on the engine (compute package).** A `compute` node schema (`Polygon & {node}`) per shape
  type registered through M1; `Box` / `FunctionBody` / every shape component moved verbatim under `NodeViewProps`;
  `computeNodeDef.ports(node)` from the schema and `node.ports` written from runtime meta; `createComputeProjection`
  replacing `useGraphMonitor` + `ComputeShapeLayout`; bullets over the link layer; `DiagnosticOverlay`; the circuit
  factories emitting engine nodes; `createComputeGraph.test.ts` and the eleven stories over the projection. The
  controller, `useComputeNodeState`, `node-defs.ts` and the conductor runtime are untouched.
- **M4: persistence and the plugin switch.** `createEchoStore(board)` over `CanvasBoard.layout` (nodes ↔
  `layout.nodes`, links ↔ `layout.edges`, z from array order on first read) so every existing board opens
  unchanged; a `layout` intent handled by the projection (dagre / ELK through `@dxos/diagram`, dropping `@antv`);
  `plugin-conductor`'s `CanvasArticle` renders `SceneView` with the compute projection and the ECHO store, hotkey
  scopes wired by the container; `plugin-debug` presets on the new factories; Composer `optimizeDeps` and the
  app-framework allowlist updated. canvas-editor and canvas-compute keep exporting until M5.
- **M5: retire.** Delete `react-ui-canvas-editor` and the old `react-ui-canvas` `Canvas` exports (DESIGN phase 4);
  `react-ui-canvas-compute` keeps only the compute-specific code (controller, projection, shapes, bullets). Text
  inline editing and undo (phase 2) are independent of this step but should precede the user-facing switch in M4
  if conductor's users rely on note editing; today `onEdit` is unreachable in the editor, so they do not.

Rough size: M1 small (types + tests), M2 medium (UI, the largest surface), M3 medium (mostly moves), M4 medium
(store + plugin), M5 small. Every step is verifiable with the existing stories plus one new story per step.
