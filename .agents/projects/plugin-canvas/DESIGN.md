# plugin-canvas — Design

Status: spec for review (2026-09-20). Inputs: `AUDIT.md` (existing surfaces),
`agents/superpowers/specs/2026-09-20-infinite-canvas-research.md` (external landscape), and the throwaway spike
`packages/ui/react-ui-canvas/src/experimental/` (story `ui/react-ui-canvas/experimental/SceneView`).

## 1. Goal

An infinite, zoomable canvas that represents diagrams at multiple depths. A **scene** is one level of detail; it
holds **cells** (rectangles, text, ECHO object cards, links, and portals to child scenes). Zooming into a portal
drills to the child scene; zooming out returns to the parent. Cells host live HTML (editors, `Surface`s).

Non-goals for the prototype: freehand drawing, cross-scene links, multiplayer cursors, orthogonal edge routing,
export formats. `react-ui-canvas-editor` and `plugin-conductor` keep working untouched until the engine replaces
them.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **Rewrite** a new engine; do not adopt `@xyflow/react` or tldraw | xyflow has one viewport per instance, a 0.5–2× zoom design, flat nested divs with z-index bugs and one store per instance; tldraw's SDK license blocks production. See `AUDIT.md` §5. |
| 2 | Engine lives in **`packages/ui/react-ui-canvas/src/scene/`** during development | It replaces the current `Canvas` eventually; a sibling folder keeps the old exports intact for canvas-editor/compute/sequencer until the switch. |
| 3 | **All type definitions local** to the package (Effect `Schema`, no ECHO `Type.makeObject` yet) | `react-ui-canvas-editor/src/types/schema.ts` is replaced only once the prototype works; a plain schema wraps into an ECHO type without change. |
| 4 | **Depth = scene nesting**; within a scene one flat coordinate space | Answers from kickoff: containment is the hierarchy, grouping inside a scene is visual only. |
| 5 | **Per-scene local coordinates**, doubles, unit = CSS px at zoom 1 | A global `(x, y, depth)` compounds float32 error in the compositor after a few levels and couples separate documents. |
| 6 | **Scene bounds are derived** from content (union of placed cells, padded), never stored | Muse "flex boards"; a portal maps the child's derived bounds into the cell. |
| 7 | **HTML root**, SVG and canvas as layers | Cells host live React content; SVG `foreignObject` is unreliable for that. |
| 8 | **d3 only as pure functions**: `interpolateZoom`, `d3-shape` curves | Native Pointer Events replace d3-zoom/d3-drag and keep React owning the DOM. |
| 9 | **Links are cells** | One map gives ordering, selection, undo and nesting uniformly; the spike's links inside the transformed layer rendered correctly in nested scenes for free. |
| 10 | **Two live depths max** (root + one nested), further depths as previews | Bounded DOM; verified in the spike. |

## 3. Data model

```ts
Point  = { x, y }            Size = { width, height }
Camera = { x, y, zoom }      // screen = (scene + {x, y}) * zoom

Scene = {
  id: string,
  name?: string,
  cells: Record<CellId, Cell>,           // map inside the scene; cells are values, not objects
}

Cell = Base & (Rect | Text | Object | Portal | Link)
Base   = { id, kind, z: string /* fractional index among siblings */, locked?: boolean }
Placed = { center: Point, size: Size }
Rect   = Placed & { kind: 'rect', label?, style? }
Text   = Placed & { kind: 'text', text }
Object = Placed & { kind: 'object', object: Ref }          // ECHO object rendered via Surface (phase 2)
Portal = Placed & { kind: 'scene', scene: SceneId }        // Ref<Scene> once ECHO-backed
Link   = { kind: 'link', source: { cell, side? }, target: { cell, side? }, ends? }
```

- `bounds(scene)` is derived: union of placed cells plus padding; an empty scene gets a default extent.
- A scene referenced from two portals is a Muse "linked card"; nothing forbids it.
- Ephemeral state (selection, hover, drag offset, camera, scene path) lives in per-view atoms, never in the scene.
- **Store seam**: `SceneStore { get(id): Scene; update(id, fn) }`. Phase 1 is in-memory; phase 3 backs it with
  ECHO using the `Obj.update` + `Obj.subscribe` contract from `AUDIT.md` §3.

## 4. Coordinate system and camera

- A view has a **scene path** (breadcrumbs) and a **camera** for the current root scene, zoom bounded to
  `[1/32, 32]`.
- **Portal mapping**: `s = min(cell.width / bounds.width, cell.height / bounds.height)`; child point `q` maps to
  parent point `cellOrigin + (q - bounds.origin) * s`.
- **Drill-in** = animate the camera to fit the portal (`interpolateZoom`, 250–800 ms), then swap the root scene
  and re-express the camera in child space (`enterPortal`); **drill-out** is the inverse (`exitPortal`) followed
  by a fit of the parent. Both verified seamless in the spike.
- **Auto drill**: after a zoom gesture settles (150 ms), a portal covering ≥ 85% of the viewport becomes the root;
  a root covering < 30% yields to its parent. The swap preserves coverage, so the two rules cannot oscillate.
- **Tiers** for a portal by on-screen size (`min(size) × composed zoom`): `< 40px` tile, `< 260px` title +
  cell count (later: rasterised thumbnail), else live child scene, only while `depth < 2`. Hysteresis of ±10% at
  the boundaries to stop flapping.

## 5. Rendering

Root `div` with `contain: strict`, `touch-none`, focusable. Layers, bottom to top:

1. **Grid**: the existing multi-resolution SVG `GridComponent` fed `{scale: zoom, offset: camera × zoom}`.
2. **Scene layer**: one `div` whose transform is `scale(zoom) translate(x, y)`, set **imperatively from the
   camera atom** (no React re-render on pan/zoom). Inside, one `div` per placed cell positioned at its bounds, and
   one `svg` (overflow visible) per scene holding link paths in scene coordinates. Portals in the live tier mount
   a nested scene layer with the portal transform, read-only.
3. **Overlay**: an `svg` sharing the camera transform for the selection box, marquee, snap lines and handles;
   rendered by React from the atoms.

Cells choose an HTML container (rect, text, object) or SVG content (future shapes). Stroke widths are compensated
by zoom because CSS transforms on a parent div defeat `vector-effect`. Canvas2d is reserved for portal thumbnails.

## 6. Interaction

Pointer Events state machine with tools: `select` (default), `hand`, `rect`, `text`, `scene`, `link`.

| Gesture | Behaviour |
|---|---|
| Wheel | Pan. Ctrl/cmd+wheel (trackpad pinch) zooms about the cursor. Touch pinch zooms about the midpoint. |
| Space+drag, hand tool, drag on background | Pan (marquee replaces background-drag in `select` once marquee lands). |
| Click / shift-click | Select / toggle; cmd+A selects all. Hit testing from the model in scene coordinates, never `getClientRects`. |
| Drag selected cells | Transient offset in an atom, snapped to grid in scene coordinates; one store update on pointer-up (the undo unit). |
| Corner/edge handles | Resize with the same commit rule. |
| Drag from a side handle | Creates a link `{cell, side}` to the drop target; routed with `d3-shape` link curves. |
| Double-click portal / auto | Drill-in. Escape / breadcrumb / auto | Drill-out. |
| Palette click then drag on canvas | Creates rect, text or portal (new empty child scene). |
| Keys | Arrows nudge (shift ×10), Delete, Escape, shift+1 fit, shift+2 fit selection, shift+0 reset; via the attention-scoped hotkeys used by canvas-editor. |
| External drag-in | pragmatic-dnd drop target only; internal gestures are pointer-driven. |
| Undo | Per-view command log of inverse store updates (phase 2); ECHO history later. |

## 7. Package layout

```
packages/ui/react-ui-canvas/src/scene/
  types.ts        Schema definitions (Scene, Cell, Camera)
  store.ts        SceneStore seam + in-memory implementation + derived bounds
  camera.ts       projection, zoomAt, fitBounds, enterPortal/exitPortal, coverage, animateCamera (pure, tested)
  hit.ts          hit testing + marquee intersection in scene coords (pure, tested)
  index.ts        fractional index helpers (pure, tested)
  atoms.ts        per-view atoms: camera, path, selection, drag, tool
  hooks/          useCamera (imperative transform), useWheel, usePointer (state machine), useShortcuts
  components/     SceneView, SceneLayer, CellView (+ per-kind renderers), Overlay, Palette, Breadcrumbs
  testing/        fixtures (scene tree builder)
  SceneView.stories.tsx
```

Exported from the package under `./scene` (not the root barrel) until it replaces `Canvas`. The spike folder
`src/experimental/` is deleted in the phase 1 PR.

## 8. Phases

1. **Phase 1 (first PR)**: types, store, camera, hit testing, fractional index; `SceneView` with grid, wheel/pinch
   /pan, click/shift/marquee select, move, drill-in/out (double-click, auto, Escape, breadcrumbs), palette with
   rect / link / scene, storybook with a nested fixture, unit tests for every pure module.
2. **Phase 2**: text and object cells with `Surface`, resize handles, snap lines, keyboard nudge, undo log,
   portal thumbnails, external drag-in.
3. **Phase 3**: ECHO-backed store (`Scene` as an ECHO type, cells in a mutable record, `Ref` for objects and child
   scenes), `plugin-canvas` with article surface and create action.
4. **Phase 4**: retrofit `react-ui-canvas-editor` (compute shapes as cell renderers), retire the old `Canvas`
   exports, delete `react-ui-canvas-editor/src/types/schema.ts`.

## 9. Testing

- Vitest (node) for `camera.ts`, `hit.ts`, `index.ts`, `store.ts` bounds derivation: round trips, zoom-about-point
  invariance, `enterPortal ∘ exitPortal = id`, coverage thresholds, tier selection with hysteresis.
- Storybook story with a 4-deep fixture; a scripted story exercising drill-in/out and drag via Playwright in a
  later phase.
- Manual test script on the story (numbered) mirrors the spike's list.

## 10. Open questions

1. Should a portal keep the child's aspect ratio (letterbox) or stretch non-uniformly? Prototype letterboxes.
2. Where does the default extent of an empty scene come from (fixed 1600×1000 vs. viewport-derived)?
3. Whether the palette lives in the engine or the plugin toolbar (engine ships a minimal one for the story).
