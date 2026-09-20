# plugin-canvas — Design

Status: spec for review (2026-09-20, rev 2). Inputs: `AUDIT.md` (existing surfaces), `RESEARCH.md` (external
landscape), and the throwaway spike `packages/ui/react-ui-canvas/src/experimental/` (story
`ui/react-ui-canvas/experimental/SceneView`).

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

| # | Decision | Why |
|---|---|---|
| 1 | **Rewrite** a new engine; do not adopt `@xyflow/react` or tldraw | xyflow has one viewport per instance, a 0.5–2× zoom design, flat nested divs with z-index bugs and one store per instance; tldraw's SDK license blocks production. See `AUDIT.md` §5. |
| 2 | Engine lives in **`packages/ui/react-ui-canvas/src/scene/`** during development | It replaces the current `Canvas` eventually; a sibling folder keeps the old exports intact for canvas-editor/compute/sequencer until the switch. |
| 3 | **All type definitions local** to the package (Effect `Schema`, no ECHO `Type.makeObject` yet) | `react-ui-canvas-editor/src/types/schema.ts` is replaced only once the prototype works; a plain schema wraps into an ECHO type without change. |
| 4 | **Depth = scene nesting**; within a scene one flat coordinate space | Containment is the hierarchy; grouping inside a scene is visual only. |
| 5 | **Per-scene local coordinates**, doubles, unit = CSS px at zoom 1 | A global `(x, y, depth)` compounds float32 error in the compositor after a few levels and couples separate documents. |
| 6 | **Scene bounds are derived** from content (union of placed cells, padded), never stored | Muse "flex boards"; a portal maps the child's derived bounds into the cell. |
| 7 | **Rendering: DOM root** with the camera as one CSS transform; SVG as layers (links, overlay); canvas2d only for thumbnails. No third-party engine | Cells host live React content; SVG `foreignObject` is unreliable; pixi/konva cannot host HTML. |
| 8 | **d3 only as pure functions**: `interpolateZoom`, `d3-shape` curves | Native Pointer Events replace d3-zoom/d3-drag and keep React owning the DOM. |
| 9 | **Links are cells** with `{cell, port?}` endpoints | One map gives ordering, selection, undo and nesting uniformly; a missing port means "automatic". |
| 10 | **Two live depths max** (root + one nested), further depths as previews | Bounded DOM; verified in the spike. |
| 11 | **The surface never writes coordinates.** It emits *intents* (move, resize, link, create, delete) to a `Projection`, which owns the drawing model and re-projects | This is what makes variants 1–3 share one surface. |
| 12 | **Ports come from the cell definition** (`CellDef.ports`), not from the data | Same as anchors in canvas-editor's `ShapeRegistry` and `Port {side, offset}` in react-ui-diagram; shape-specific, not per-instance. |

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
  scene: Atom<Scene>;                       // positioned cells; re-emitted on every model change
  apply: (intent: Intent) => void;          // may reject, partially apply, or rewrite the model
  capabilities: { move?: boolean; resize?: boolean; link?: boolean; create?: boolean };
};

type Intent =
  | { kind: 'move';   ids: CellId[]; delta: Point }
  | { kind: 'resize'; id: CellId; bounds: Bounds }
  | { kind: 'link';   source: Endpoint; target: Endpoint }
  | { kind: 'create'; cell: Cell }
  | { kind: 'delete'; ids: CellId[] }
  | { kind: 'reorder'; id: CellId; z: string };
```

| Variant | Model | `project` | `apply(move A by Δ)` | Existing pieces to reuse |
|---|---|---|---|---|
| **1 freehand** | `Scene` with stored `center/size` (tldraw-like) | identity | writes `center` | the spike |
| **2 constrained** | a DSL: `plugin-illustrator` `Scene.Command`s, or cardinal constraints (`A east of B`, `A aligned with B`, `A inside G`) | a solver (cardinal constraints → longest-path ranks per axis, then packing); or a dialect's `compile` | classifies the drop against neighbours and **rewrites the constraint** (A dragged left of B → `A west of B`), then re-solves; ambiguous drops are rejected and snap back | illustrator `dialect.ts`, `layout.ts` (`rank`), `uml-grid.ts`, `ortho-router.ts` |
| **3 dynamic** | an external ECHO graph (objects + relations) | a layout engine (illustrator `Layout.rank`, dagre, ELK) produces cells and links; an `Overlay {positions, collapsed, labels}` (react-ui-diagram's pattern) applies on top | fixed layout: reject; hybrid: write an override into the `Overlay`; graph edits re-run the engine and overrides that still resolve survive | react-ui-diagram `types/diagram.ts` (`Overlay`), `model/layout.ts`; illustrator engines |

Variant 2 needs a **relative coordinate system** in the DSL: constraints are expressed in a named frame
(`grid`, `lanes`, `radial` later). The solver for the prototype is deliberately small: cardinal relations only,
one rank pass per axis, equal cell sizes, snapped to the grid.

Mixed scenes are allowed at the cell level in phase 2 (a freehand scene containing a portal to a dynamic scene is
already supported, since the projection is per scene).

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

| Gesture | Effect |
|---|---|
| Double-click a portal, or Enter with a portal selected | Animated drill-in |
| Pinch/ctrl+wheel until a portal fills the view | Auto drill-in (no animation, camera preserved) |
| Escape, breadcrumb click, "Up", or zooming the root below 30% coverage | Drill-out (breadcrumb jumps several levels) |
| Alt+← / Alt+→ | Back / forward through a history of `{path, camera}` entries |
| Shift+1 / Shift+2 / Shift+0 | Fit scene / fit selection / reset zoom |
| Double-click a non-portal cell | Opens it (`CellDef.openable`, e.g. text editing, or the ECHO object) |
| URL / deep link (phase 3) | `{path, camera}` serialised so a location inside a nested scene is shareable |

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

| Gesture | Behaviour |
|---|---|
| Wheel | Pan. Ctrl/cmd+wheel (trackpad pinch) zooms about the cursor. Touch pinch zooms about the midpoint. |
| Space+drag, hand tool | Pan. Drag on background in `select` = marquee (intersection); shift adds. |
| Click / shift-click | Select / toggle; cmd+A selects all. Hit testing from the model in scene coordinates, never `getClientRects`. |
| Drag selected cells | Transient offset atom, snapped in scene coordinates; on pointer-up one `move` intent (the undo unit). The projection decides what that means (§3). |
| **Control frame** | Shown for the selection: outline, eight resize handles (`resize` intent, respects `CellDef.minSize`), ports on hover of the frame or with the `link` tool. |
| Drag from a port (or from the frame edge with the `link` tool) | Rubber band; drop on a port pins both ends, drop on a cell body leaves the target automatic, drop on empty canvas creates a rect and links to it (canvas-editor behaviour). Emits a `link` intent. |
| Drag a link end | Re-attach; onto a port pins, onto a body unpins. |
| Palette click then drag on canvas | `create` intent for rect, text or portal (new empty child scene). |
| Keys | Arrows nudge (shift ×10), Delete, Escape, navigation keys from §6; via the attention-scoped hotkeys used by canvas-editor. |
| External drag-in | pragmatic-dnd drop target only; internal gestures are pointer-driven. |
| Undo | Per-view log of inverse intents (phase 2); ECHO history later. |

## 9. Package layout

```
packages/ui/react-ui-canvas/src/scene/
  types.ts          Schema: Scene, Cell, Endpoint, Port, Camera, Intent
  registry.ts       CellDef registry (component, ports, resizable, openable) + default defs
  projection.ts     Projection seam + intent types
  projections/
    freehand.ts     identity projection over an in-memory (later ECHO) store
    constrained.ts  cardinal-constraint DSL + solver; intents rewrite constraints
    dynamic.ts      graph → layered layout (rank/columns) + Overlay overrides
  store.ts          SceneStore seam + in-memory implementation + derived bounds
  camera.ts         projection math, zoomAt, fitBounds, enterPortal/exitPortal, coverage, animateCamera
  hit.ts            hit testing, marquee intersection, port lookup in scene coords
  ports.ts          port geometry per side/offset, automatic port pairing
  route.ts          curve routing (d3-shape); ortho later
  index.ts          fractional index helpers
  atoms.ts          per-view atoms: camera, path, history, selection, drag, tool
  hooks/            useCamera (imperative transform), useWheel, usePointer (state machine), useShortcuts
  components/       SceneView, SceneLayer, CellView (+ per-kind renderers), ControlFrame, Overlay, Palette, Breadcrumbs
  testing/          fixtures: scene tree, constraint set, object graph
  SceneView.stories.tsx   Freehand, Constrained, Dynamic, Nested
```

Exported from the package under `./scene` (not the root barrel) until it replaces `Canvas`. The spike folder
`src/experimental/` is deleted in the phase 1 PR. Illustrator's `rank` (30 lines) is copied rather than imported
because a UI package cannot depend on a plugin; the two converge when the layout code moves to a shared package.

## 10. Phases

1. **Phase 1 (first PR)**: types, registry, projection seam, freehand + constrained + dynamic projections
   (minimal), store, camera, hit testing, ports with automatic pairing, curve routing, fractional index;
   `SceneView` with grid, wheel/pinch/pan, select/marquee, control frame with move + resize, port-drag linking,
   drill-in/out (double-click, auto, Escape, breadcrumbs, history), palette with rect / link / scene; **four
   stories**: `Freehand` (nested fixture), `Constrained` (cardinal constraints; dragging rewrites them),
   `Dynamic` (object graph → layout; toggle nodes to re-layout; drag writes an override), `Nested` (depth 4);
   unit tests for every pure module.
2. **Phase 2**: text and object cells with `Surface` + type projectors, ortho routing, snap lines, keyboard nudge,
   undo log, portal thumbnails, external drag-in, mixed-variant scenes.
3. **Phase 3**: ECHO-backed store (`Scene` as an ECHO type, cells in a mutable record, `Ref` for objects and child
   scenes), dynamic projection over a real ECHO query, deep links, `plugin-canvas` with article surface and
   create action.
4. **Phase 4**: retrofit `react-ui-canvas-editor` (compute shapes as cell defs), retire the old `Canvas` exports,
   delete `react-ui-canvas-editor/src/types/schema.ts`; illustrator dialects become constrained projections.

## 11. Testing

- Vitest (node) for `camera.ts`, `hit.ts`, `ports.ts`, `index.ts`, `store.ts`, and each projection: round
  trips, zoom-about-point invariance, `enterPortal ∘ exitPortal = id`, coverage thresholds, tier hysteresis,
  automatic port pairing re-attaches after a move, a constrained `move` rewrites the expected constraint and the
  re-solve honours it, a dynamic override survives an unrelated graph change and is dropped when its node goes.
- Storybook: the four stories above; a scripted story exercising drill-in/out, linking and drag via Playwright in a
  later phase.
- Manual test script on each story (numbered).

## 12. Open questions

1. Portal aspect: letterbox (prototype) or stretch?
2. Default extent of an empty scene: fixed 1600×1000 or viewport-derived?
3. Palette in the engine or the plugin toolbar (engine ships a minimal one for the stories)?
4. Constrained DSL surface: reuse illustrator `Scene.Command` verbatim, or a smaller constraint grammar the
   surface can rewrite unambiguously? The prototype uses the small grammar and maps it to commands later.
