# Board / canvas surface audit

Audit of every spatial surface in the repo, taken 2026-09-20, as input to the infinite multi-depth canvas
design (`DESIGN.md`). Paths are repo-relative. Line counts are `wc -l` of `src`.

## 1. Summary table

| Package / component                        | Root renderer                                      | Infinite pan/zoom                | Coords                                                                          | Hierarchy                                                            | Persistence                                                                         | Drag lib                                      | Select                                      | Edges                                           | HTML islands                       | Lines       | Consumers                                                 |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- | ----------------------------------------------- | ---------------------------------- | ----------- | --------------------------------------------------------- |
| `react-ui-canvas` `Canvas`                 | DOM, one CSS `translate/scale` on child layers     | Yes, no zoom clamp               | Continuous world, `{scale, offset}` matrix (`transformation-matrix`)            | None                                                                 | None                                                                                | Raw pointer (pan), `useWheel`                 | None                                        | None                                            | Yes (children under transform)     | 2464 (pkg)  | canvas-editor, canvas-compute, plugin-sequencer           |
| `react-ui-canvas` `Grid`                   | SVG `<pattern>`                                    | n/a                              | Follows projection                                                              | n/a                                                                  | n/a                                                                                 | n/a                                           | n/a                                         | n/a                                             | n/a                                | —           | canvas-editor                                             |
| `react-ui-canvas` `CellGrid`               | 2× HTML canvas (static + overlay) + input div, rAF | Scroll ≥ 0, x-zoom only 0.25–8   | Discrete cells, `Viewport {scrollX, scrollY, baseCellWidth, cellHeight, zoomX}` | None                                                                 | Atoms (ECHO anticipated)                                                            | Pointer handlers                              | Rect range                                  | None                                            | No                                 | ~800        | plugin-sequencer                                          |
| `react-ui-canvas-editor` `Editor`/`Canvas` | DOM frames + per-path SVG, on `react-ui-canvas`    | Yes; zoom-in ≤16, zoom-to-fit ≤1 | World centres, `Polygon {center, size}`, snap 16                                | None (flat `{nodes, edges}`)                                         | ECHO `CanvasBoard.layout: GraphModel.Data`                                          | pragmatic-dnd + `DragMonitor` atom            | Click, shift-marquee (DOM `getClientRects`) | `Connection` derived to `PathShape` each render | Yes (every polygon is React)       | 5276        | plugin-conductor, plugin-debug (headless), canvas-compute |
| `react-ui-canvas-editor` `GraphCanvas`     | `@xyflow/react`                                    | xyflow                           | xyflow, `origin [0.5,0.5]`                                                      | None                                                                 | Same model                                                                          | xyflow                                        | xyflow                                      | xyflow default                                  | xyflow nodes                       | 325         | Story only, not exported, dev-dep                         |
| `react-ui-canvas-compute`                  | Shape defs into editor registry                    | inherits                         | inherits                                                                        | Planned "group nodes", never built                                   | ECHO (`CanvasBoard` + `Ref(ComputeGraph)`)                                          | inherits                                      | inherits                                    | inherits                                        | Yes (`Surface`, Cards, CodeMirror) | 4619        | plugin-conductor, plugin-debug                            |
| `react-ui-board` `Board`                   | DOM abs-pos tiles in `ScrollArea`, CSS `scale()`   | No: finite grid, zoom (0,1]      | Integer cells `{x,y,w,h}`                                                       | None                                                                 | ECHO `BoardLayout {size, cells: Record<id, cell>}` + `items: Ref[]`                 | pragmatic-dnd; raw pointer resize + magnetize | Single/multi (shift)                        | None                                            | Yes (`Surface` CardContent)        | 2852        | plugin-board, plugin-studio Lightbox                      |
| `react-ui-board` `Chain`                   | `@xyflow/react` spike                              | xyflow                           | xyflow                                                                          | None                                                                 | None (local state)                                                                  | xyflow                                        | xyflow                                      | xyflow                                          | Custom node div                    | ~100        | Story only, not exported                                  |
| `react-ui-diagram` `Diagram`               | `@xyflow/react`                                    | xyflow, `fitView maxZoom 1`      | World, quantised `GRID 16`; children parent-relative                            | **Yes**: `Node.parent`, `type 'group'`, `parentId + extent 'parent'` | None (`Overlay` designed, no writer)                                                | xyflow (`onNodeDragStop`)                     | xyflow                                      | xyflow, `nodesConnectable=false`                | DOM nodes, no `Surface`            | 1317        | None (private)                                            |
| `react-ui-graph`                           | SVG, imperative d3; `d3-zoom` on `<g>`             | Yes, extent 1/4–4                | Centred-origin viewBox, `Scale` util                                            | Synthetic cluster/hier projectors only                               | None                                                                                | d3-drag                                       | `onSelect`                                  | Yes (SVG paths, linker)                         | No                                 | 8784        | devtools, plugin-explorer, react-ui-rdf                   |
| `react-ui-gameboard`                       | CSS grid 8×8                                       | No                               | Discrete `[col,row]`                                                            | None                                                                 | Atom model                                                                          | pragmatic-dnd                                 | n/a                                         | None                                            | Squares/pieces only                | 1134        | plugin-chess                                              |
| `react-ui-dashboard`                       | CSS grid                                           | No                               | n/a (activity calendar)                                                         | None                                                                 | None                                                                                | None                                          | None                                        | None                                            | n/a                                | 703         | plugin-space                                              |
| `react-ui-geo` / `solid-ui-geo`            | Globe: canvas2d `d3-geo`; Map: Leaflet             | Geographic                       | Geographic projections                                                          | None                                                                 | None                                                                                | custom                                        | n/a                                         | n/a                                             | No                                 | 3113 / 2113 | plugin-map, plugin-trip, plugin-map-solid                 |
| `plugin-tldraw`                            | tldraw 3.x (`TldrawEditor`)                        | tldraw                           | tldraw                                                                          | tldraw frames/groups                                                 | ECHO `Drawing → Ref(Canvas {schema, content: Record})` via `echo-doc` store adapter | tldraw                                        | tldraw                                      | tldraw                                          | tldraw                             | ~20 files   | composer                                                  |
| `plugin-excalidraw`                        | Excalidraw                                         | Excalidraw                       | Excalidraw                                                                      | Excalidraw groups/frames                                             | Same `Drawing`/`Canvas` (`excalidraw.com/2`)                                        | Excalidraw                                    | Excalidraw                                  | Excalidraw                                      | No                                 | —           | composer                                                  |
| `plugin-illustrator`                       | `SceneSvg.tsx` SVG scene renderer + UML grid       | No                               | Scene model                                                                     | `model/scene.ts`                                                     | Owns `Drawing`/`Canvas` types                                                       | n/a                                           | n/a                                         | n/a                                             | No                                 | —           | tldraw, excalidraw variants                               |

Not spatial despite the name: `plugin-graph` (app navigation graph), `plugin-spacetime` (3D Babylon).

`@xyflow/react`: catalog `^12.8.1` (`pnpm-workspace.yaml:313`), resolved 12.8.1 with `@xyflow/system 0.0.65`. Three
packages declare it; only `react-ui-diagram` uses it on a real render path. CSS: `Chain` and `Diagram` import
`dist/base.css`, `GraphCanvas` imports `dist/style.css`.

## 2. Findings that shape the design

1. **No surface combines continuous coordinates with hierarchy.** `react-ui-canvas`/`canvas-editor` have world
   coordinates and a flat list; `react-ui-diagram` has parent-relative nesting but xyflow owns its viewport and
   nodes cannot host `Surface`s. Nothing persists a nested scene to ECHO.
2. **No content level-of-detail anywhere.** The only LOD is the grid pitch (`Grid.tsx` ratios `[1/4, 1, 4, 16]`
   clamped to 16–128 px) and map topology simplification. Only `CellGrid` culls off-screen content; the editor
   mounts every shape as a React component on every render (`Shapes.tsx:46-54`, `useLayout.ts:70`).
3. **The editor's rendering is a single global CSS transform** shared by shapes, drag previews and overlays
   (`react-ui-canvas/src/components/Canvas/Canvas.tsx:58-64`). No per-subtree transform, no clipping, and
   `zoom-to-fit` caps at scale 1 (`useActionHandler.ts:82`), which is the inverse of drill-down.
4. **Editor reactivity is manual repaint.** The graph model is mutated in place and does not notify React;
   `forceUpdate` in `Editor.tsx:94-98`, a `repaint()` hack on delete, and per-output force updates in
   canvas-compute. Undo/redo are stubs (`useActionHandler.ts:146-152`).
5. **Hit testing is DOM-measured** (`getClientRects` in `Canvas/shape-defs.ts:35-38`), so culled or canvas-drawn
   content would be unselectable.
6. **Domain leakage:** the generic editor package depends on `@dxos/conductor` for its ECHO schema and edge defaults
   (`types/schema.ts:8`, `types/model.ts:5`); `canDrop` hard-codes `'rectangle'`; production link-creation calls
   `testing/` factories.
7. **Three input stacks coexist** in the editor (pointer events for pan, pragmatic-dnd for shapes/anchors,
   d3-drag in `useRope`), plus two zoom implementations and two coordinate models across the canvas packages.
8. **Test coverage is thin**: `resizeAxis` and `CellGrid.viewport` only. A rewrite has almost no regression net.
9. **The repo already hosts a third-party infinite canvas on ECHO** (`plugin-tldraw` via the `Drawing → Canvas
{schema, content}` indirection and `echo-doc/src/store-adapter.ts`), and mirrors selection with
   `shape.meta.object`. This is the established pattern for an opaque CRDT content bag.

## 3. Reusable modules (carry forward)

| Module                                                                                | Why                                                                                                         |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `react-ui-canvas/src/hooks/projection.tsx`                                            | Pure `{scale, offset}` matrix mapper, zoom-about-point, eased `zoomTo`. No React. Composes per scene.       |
| `react-ui-canvas/src/hooks/useWheel.tsx`                                              | Complete trackpad pan + ctrl/cmd pinch, capture-phase non-passive.                                          |
| `react-ui-canvas/src/components/Grid/Grid.tsx`                                        | Multi-resolution SVG grid keyed on scale; the LOD pattern for the grid layer.                               |
| `react-ui-canvas/src/components/CellGrid/{state/viewport.ts, render/*}`               | Culled, rAF, DPR-correct canvas2d painting off atoms. Template for the canvas half of a hybrid renderer.    |
| `react-ui-canvas-editor/src/layout/geometry.ts`                                       | ~30 pure rect/point/path functions incl. line–rect intersection and curve builders.                         |
| `react-ui-canvas-editor/src/components/Canvas/registry.ts`                            | `ShapeRegistry`/`ShapeDef` plug-in seam, proven by 27 compute shapes. Extend with renderer/LOD hints.       |
| `react-ui-canvas-editor/src/hooks/{useShortcuts,useSnap}.ts`, `KeyboardContainer.tsx` | Attention-scoped hotkeys, grid snapping. Renderer-independent.                                              |
| `plugin-conductor/.../CanvasArticle.tsx:44-54` + `CanvasGraphModel`                   | The `Obj.update` mirror + `Obj.subscribe → sync()` ECHO write/reload contract.                              |
| `react-ui-diagram/src/{types/diagram.ts, model/layout.ts}`                            | Only tested hierarchy-aware model and layout (parent-relative coords, groups sized to children, `Overlay`). |
| `react-ui-board/src/components/Board/engine.ts`                                       | Pure collision/compaction/resolver algebra; optional snap/pack mode for tiles inside a scene.               |
| `react-ui-board` `Board.Map` (`Board.tsx:957-1007`)                                   | Minimap whose viewport outline is read from live DOM geometry.                                              |
| `react-ui-graph/src/graph/projector/projector.ts`                                     | `'topology'                                                                                                 | 'positions'` update kinds; fast path for position-only changes. 12 layout projectors. |
| `plugin-board/.../BoardArticle.tsx:207-217`                                           | The working `Surface type={AppSurface.CardContent}` hosting pattern for an ECHO object in a cell.           |
| `echo-doc/src/store-adapter.ts` + `plugin-illustrator/src/types/Drawing.ts`           | Opaque CRDT content bag with dialect id; how third-party canvases are hosted today.                         |

## 4. Per-package notes

### `react-ui-canvas`

Exports `Canvas`, `Grid`, `CellGrid`, `FPS`, `ProjectionMapper`, `useDrag`, `useWheel`, `Point/Dimension/Rect`
schemas. `Canvas` keeps projection in React `useState` and publishes `styles` on context; the root div does not
apply the transform, consumers do. No zoom clamp. d3 is used only for eased transitions. Deps:
`transformation-matrix`, `bind-event-listener`, `react-resize-detector`, `@effect/atom-react`, `d3`.
Tests: `CellGrid/state/viewport.test.ts`. Stories: Canvas, Grid, CellGrid, svg.

### `react-ui-canvas-editor`

Exports `Editor {Root, Canvas, UI}`, `Shapes`/`Frame`/`Anchor`, `ShapeRegistry`, hooks, layout, shapes
(`rectangle`, `ellipse`, `note`, `path`), `CanvasGraphModel`, `CanvasBoard`. Polygons are absolutely positioned
divs at `center`; paths are per-shape SVGs with a hit path and markers from a hidden `dx-defs` SVG. Edges are not
persisted geometrically; `useLayout` re-routes them every render (anchor-to-anchor cubic or centre-to-centre with
rect clipping). Auto-layout via `@antv/layout` (circular/force/grid/radial). Shortcuts are macOS-only combos.
Tests: `useDragMonitor.test.ts` (resize axis). Stories: Editor, Frame, Rope, TextBox, GraphCanvas.

### `react-ui-canvas-compute`

27 compute shape defs plus `ComputeGraphController` mirroring canvas nodes into a `ComputeGraph` (two ECHO graphs
kept in sync by `useGraphMonitor`). Demonstrates the HTML-island model at full strength (`Surface`, Cards, audio,
tables inside frames). README lists "Group nodes (sub-graph)" and "Auto layout" as open.

### `react-ui-board`

`Board {Root, Container, Viewport, Content, Backdrop, Cell, Zoom, Map}`. One DOM drop-target per backdrop cell
(no virtualisation); drag disabled below zoom 1; `resolveCollisions`/`compact`/`pushToFit`/`resizeToFit`/
`rejectIfNoFit` resolvers. `Chain` is an unexported xyflow spike with a header comment calling it a "possible
replacement for react-ui-canvas". Tests: `engine.test.ts`, `geometry.test.ts`.

### `react-ui-diagram`

Private, no consumers. Neutral `Graph/Node/Edge/Port/Overlay` schemas with `Node.parent`; nodes registered as
`'node'`/`'container'` to dodge xyflow's built-in group border; explicit `width/height` required because
`extent: 'parent'` clamps against measured size; each port emits both a source and a target `Handle` because
xyflow drops mismatched handle types silently. Layout is hand-rolled layered, ELK intended. Tests: `layout.test.ts`,
`mermaid.test.ts`.

### `react-ui-graph`

Imperative d3 over SVG; `useZoom` wraps d3-zoom (extent, enable/disable, reset, dblclick); `Scale` owns the
`ZoomTransform`; `useGrid` derives a multi-resolution grid from the live transform; centred-origin viewBox
convention differs from every other surface. Cannot host HTML.

### Plugins

`plugin-conductor` is the only production consumer of the editor (`CanvasArticle.tsx`, 148 lines, with a
`graphMonitor as any` cast). `plugin-debug` uses the editor headlessly to generate sample boards. `plugin-board`
writes layout back with `Obj.update(board, b => b.layout.cells = next.items)` and normalises legacy centre-origin
cells on read. `plugin-tldraw` / `plugin-excalidraw` share `plugin-illustrator`'s `Drawing`/`Canvas` types and
mirror selection through `shape.meta.object` / `element.customData.object`.

## 5. External landscape

### Comparison

| Tool                                    | Rendering                                                                                         | Nesting                                                                                                                                                                                | Semantic zoom / LOD                                                                                                     | License                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| tldraw 3.x                              | HTML div layer with CSS camera transform; per-shape div hosting `HTMLContainer` or `SVGContainer` | `parentId`, child coords local to parent, page transform composed per shape (children are NOT DOM-nested); frames clip, groups derive bounds; fractional-index z-order per sibling set | None built in; culled shapes stay in DOM as `display:none`                                                              | SDK license: dev only by default; production needs a key (trial / commercial / watermark hobby) |
| React Flow 12.11 (`@xyflow/react`, MIT) | HTML divs for nodes, SVG for edges, d3-zoom                                                       | `parentId` sub-flows, coords relative to parent, `extent: 'parent'`, parents must precede children; nested edges have z-index issues (xyflow#5203)                                     | None; "contextual zoom" example reads `store.transform[2]` in each node (re-render per zoom tick)                       | MIT                                                                                             |
| Excalidraw                              | Canvas2D (roughjs)                                                                                | Flat array with `frameId` + `groupIds`; absolute coords; children listed before frame                                                                                                  | None                                                                                                                    | MIT                                                                                             |
| JSON Canvas 1.0 (Obsidian)              | n/a (format)                                                                                      | `group` nodes are bounding boxes only, containment is spatial                                                                                                                          | None                                                                                                                    | MIT                                                                                             |
| Figma                                   | WebGL tile renderer, own DOM/compositor/text                                                      | Frames nest arbitrarily                                                                                                                                                                | Yes (tile-based, internals unpublished)                                                                                 | Proprietary                                                                                     |
| Muse / Allume                           | Native Swift, 120 fps                                                                             | Boards-in-boards, nested board rendered as a live-preview card, depth "haze"                                                                                                           | Zoom is navigation: pinch into a card, view snaps to nearest stable zoom level; pinch-out at min zoom returns to parent | Proprietary                                                                                     |

infinitecanvas.tools catalogues ~120 apps on four properties (expansiveness, zoom, direct manipulation,
collaboration) but publishes no architectural facets; the table above is assembled from primary sources.

### Muse / Allume model (the reference for "depth = containment")

1. Boards are **finite** ("flex boards" size to content); the team rejected infinite boards for disorientation and
   technical reasons. A board's card on its parent is a scaled view of that finite extent.
2. Cards keep absolute positions **within their board**; crossing a board boundary is a camera transition, not a
   coordinate change. "Linked cards" alias one board from several places.
3. Data is split into _transactional_ (positions, metadata), _blob_ (PDF/video, lazy) and _ephemeral_ (cursors,
   in-progress ink); persisted as a bag of entity-attribute-value-timestamp atoms, LWW, custom sync server.
   Sources: Ink & Switch "Muse" essay, Metamuse ep. 56 "Sync", Wiggins' retrospective.

### tldraw mechanics worth copying

1. Root `div.tl-canvas` (`contain: strict`); `div.tl-html-layer` receives the camera transform imperatively via a
   reactor, not a React re-render. Shared SVG `<defs>` in a sibling `tl-svg-context`; overlays (selection, brush,
   handles) at a fixed z-index above shapes.
2. Each shape div gets `transform = pageTransform(shape)` set imperatively; component chooses HTML or SVG container.
3. Camera `{x, y, z}`, zoom steps `[0.1 … 8]`, `zoomToBounds(bounds, {inset, targetZoom, animation})`, constraints
   (`free | fixed | inside | outside | contain`). Culling via `CullingController` with O(1) subscriptions.

### Semantic zoom / LOD patterns

1. **Discrete tiers by on-screen size**: `screenSize = size × zoom` selects dot → title → summary → live editor,
   with hysteresis. Cheap, deterministic, testable.
2. **Crossfade band** between two tiers; visual tiers only, never live editors.
3. **Drill-in = camera transition then root swap**: animate the parent camera to fit the child cell
   (`d3-interpolate` `interpolateZoom`, van Wijk–Nuij), then swap the root scene and reset the camera.
4. **Mount live HTML only at the top tier**; below it render a static preview.
5. **Precision**: doubles lose accuracy with distance from origin, and CSS transforms go through float32 in the
   compositor, so a single global `(x, y, depth)` with a monotonically growing zoom breaks after a few levels.
   tldraw bounds zoom to `[0.1, 8]`; Figma keeps everything in bounded frames. Per-scene local coordinates with a
   bounded camera give unlimited depth with bounded numbers and one CRDT doc per scene.

### d3

`d3-zoom` transform math, `constrain`, and `interpolateZoom` are DOM-agnostic and worth keeping for camera
transitions; `d3-shape` `link`/`curve*` give edge splines from side-aligned tangents (no orthogonal routing, same
as React Flow); `d3-drag` fights React DOM ownership and is replaced by ~150 lines of Pointer Events plus
ctrl+wheel pinch.

### Interaction defaults (tldraw / React Flow / Muse)

Drag on empty canvas = marquee (intersection), shift adds; space+drag and wheel = pan, ctrl/cmd+wheel = zoom at
cursor; multi-move rewrites each member's local coords; snap in scene coords; connector = handle on a cell side,
edge stores `{node, side}`; shift+1 fit, shift+2 selection, shift+0 reset; drill-in on double-click or pinch past
threshold on a scene cell, pinch-out at min zoom returns to parent.

Full research notes with sources: `RESEARCH.md`.
