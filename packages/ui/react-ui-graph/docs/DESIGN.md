# react-ui-graph — v2 Design

Status: draft (2026-05-20).
Scope: redesign of the experimental react-ui-graph prototype into a backend-agnostic graph rendering engine with first-class HTML islands, pluggable projectors, pluggable edge routers, and a hybrid scale-invariant zoom model.

The existing v1 code (`packages/ui/react-ui-graph/src`) is left untouched and continues to work; v2 is added alongside under `src/v2/` plus two new packages.

## Goals

- Render the same graph model to **SVG or Canvas** via swappable backends.
- Input is a **reactive model** (`@dxos/graph` `GraphModel.ReactiveGraphModel`, atom-backed) describing nodes and edges of different types.
- **Pluggable projection (layout)** with smooth animation between projections.
- **Pluggable per-type rendering** for nodes and edges — colour, shape, size, edge routing.
- Rich **interactions** — hover/tooltip, drag, link, selection — built from cross-cutting Tools plus per-type overrides.
- **Scale invariant / infinite zoom** with per-type LOD: an element can be fixed-pixel, world-scaled, or hybrid.
- **HTML islands** attached to nodes and edges — real React content that pans and zooms with the diagram, composes over either backend.

## Non-goals

- Replacing v1 in-place. v1 stays operational; callers migrate when v2 is ready.
- Server-side rendering, snapshot export — addressable later.
- A novel graph data model. v2 consumes today's `Graph<N,E>` shape.

## Architecture overview

One new package plus the existing React frontend in Phase 1.

```text
@dxos/graph-engine                        (NEW, framework-agnostic)
├── model        — wraps GraphModel.ReactiveGraphModel<N,E> → atom subscription
├── registry     — TypeRegistry<NodeType|EdgeType>
├── projector    — Projector abstract → ForceProjector (+ Radial/Hierarchical/Relational later)
├── router       — EdgeRouter abstract → StraightRouter (+ Bezier/Orthogonal/RadialArc later)
├── tween        — TweenService: targets in, frames out; one shared d3-timer
├── tools        — HoverTool, SelectTool, ZoomTool (+ DragTool/LinkTool later)
├── viewport     — pure: viewBox, zoom transform, world↔screen, frame events
├── backend      — RenderBackend interface + DrawContext + Path primitives
│   └── canvas   — CanvasBackend (Phase 1, immediate-mode 2D context, HiDPI)
└── (future)     — backend/svg — SvgBackend implements RenderBackend (Phase 2)

@dxos/react-ui-graph (v2)                 (existing package, src/v2/)
├── <GraphRoot>          — owns engine instance, provides EngineContext
├── <GraphSurface>       — mounts <svg> or <canvas> per backend, wires resize + pointer events
├── <HtmlOverlayLayer>   — React-managed per-node/-edge HTML islands
└── hooks                — useEngine, useViewport, useSelection, useTool
```

> Phase 1 keeps the Canvas backend inside `@dxos/graph-engine` (under `src/backend/canvas/`)
> for simplicity. Splitting into sibling `@dxos/graph-engine-backend-canvas` and
> `@dxos/graph-engine-backend-svg` packages is a Phase 2 option once we have two backends
> proven against the same `RenderBackend` interface.

## Surface composition

The on-screen result is a stack of co-registered layers, all sharing one viewport transform:

```text
┌─────────────────────────────────────────┐
│ Layer 4 — Foreground (SVG/Canvas)       │  drag previews, link-in-progress wire
├─────────────────────────────────────────┤
│ Layer 3 — HTML overlay (absolute div)   │  per-node/-edge React islands
├─────────────────────────────────────────┤
│ Layer 2 — Nodes  (SVG/Canvas backend)   │  via TypeRegistry.draw
├─────────────────────────────────────────┤
│ Layer 1 — Edges  (SVG/Canvas backend)   │  via EdgeRouter + draw
├─────────────────────────────────────────┤
│ Layer 0 — Background (SVG/Canvas)       │  grid, mesh, guides, subgraph hulls
└─────────────────────────────────────────┘
```

Layers 0/1/2/4 go through the active `RenderBackend` (SVG or Canvas). Layer 3 is always React HTML in a positioned `<div>`. Choice of SVG vs Canvas for the graphics layers is orthogonal to having HTML islands.

`<foreignObject>` is explicitly rejected for islands: it doesn't compose with Canvas; Safari/Firefox have well-known bugs with transforms, hit-testing, and printing inside it. A separate React-managed overlay layer composes identically over either backend.

## Frame loop

Each frame, in order:

1. Tools consume pointer events → mutate ephemeral interaction state (hovered id, dragging entity, etc.).
2. Projectors compute targets if the model or selection changed; force projector additionally ticks each frame.
3. TweenService advances current → target for animated layout entries.
4. Active `RenderBackend` is driven through `begin → drawEdge*(router(e)) → drawNode*(handler) → end`.
5. `HtmlOverlayLayer` reads the updated viewport-space positions and rewrites each island wrapper's CSS `transform`.

The TweenService is the single clock. Backends and the HTML overlay are listeners.

## Model & Type Registry

### Model input

Primary input: `GraphModel.ReactiveGraphModel<Node, Edge>` from `@dxos/graph`. The engine subscribes via `model.subscribe(...)` and reads `model.graph`. A small adapter also accepts a raw `Atom<Graph<N,E>>` for callers who want bare reactivity.

Nodes and edges are constrained only by `{ id: string; type?: string; data?: unknown }`. The `type` field is the registry dispatch key; missing `type` resolves to a built-in `'default'` handler.

### Type Registry

The single source of truth for what a typed node/edge looks like and how it behaves.

```ts
type NodeHandler<N> = {
  // Visual.
  draw(ctx: DrawContext, node: LayoutNode<N>, viewport: Viewport): void;
  bounds(node: LayoutNode<N>): Rect; // for culling + hit-test broad phase
  hit(point: Point, node: LayoutNode<N>): boolean;

  // Layout hints (consumed by projectors).
  preferredRadius?: number | ((node: LayoutNode<N>, children: number) => number);
  layoutWeight?: number;

  // Zoom semantics (hybrid scale-invariance).
  lod?: {
    scaling: 'fixed-pixel' | 'world' | 'hybrid';
    levels?: Array<{ minScale: number; maxScale?: number; render: 'full' | 'compact' | 'dot' }>;
  };

  // Capabilities — picked up by Tools.
  capabilities?: {
    draggable?: boolean;
    linkable?: boolean;
    selectable?: boolean;
    hoverable?: boolean;
    inspectable?: boolean;
  };

  // Per-type interaction extension (runs alongside Tools).
  onPointer?(event: SemanticPointerEvent, node: LayoutNode<N>, engine: Engine): void | 'veto';

  // Optional HTML island attached to the node.
  island?: NodeIsland<N>;
};

type EdgeHandler<N, E> = {
  router: EdgeRouterId | EdgeRouter<N, E>; // 'straight' | 'bezier' | 'orthogonal' | 'radial-arc' | custom
  draw(ctx: DrawContext, edge: LayoutEdge<N, E>, path: Path, viewport: Viewport): void;
  hit(point: Point, edge: LayoutEdge<N, E>, path: Path): boolean;
  bounds(edge: LayoutEdge<N, E>, path: Path): Rect;
  lod?: NodeHandler<any>['lod'];
  capabilities?: { selectable?: boolean; hoverable?: boolean };
  onPointer?(event: SemanticPointerEvent, edge: LayoutEdge<N, E>, engine: Engine): void | 'veto';
  island?: EdgeIsland<N, E>;
};

interface TypeRegistry<N, E> {
  registerNode(type: string, handler: NodeHandler<N>): void;
  registerEdge(type: string, handler: EdgeHandler<N, E>): void;
  resolveNode(node: N): NodeHandler<N>;
  resolveEdge(edge: E): EdgeHandler<N, E>;
}
```

`DrawContext` is the backend-neutral abstraction handlers draw against: `path()`, `fill()`, `stroke()`, `text()`, `setFill()`, `setStroke()`, `setLineWidth()`, `save()`/`restore()`, `transform()`. SVG backend maps these to d3 selection joins on the appropriate parent group; Canvas backend maps them to `CanvasRenderingContext2D` calls. Handlers don't know which backend they're on.

`Path` is a backend-neutral primitive: `{ moveTo, lineTo, bezierCurveTo, arc, close }`. SVG → `d` attribute; Canvas → `Path2D`.

## HTML islands

A type handler can declare an island — a React node anchored to a layout entity. The engine emits the entity's screen-space position each frame; the overlay layer rewrites the wrapper's CSS `transform: translate(x,y) scale(s)`. React reconciliation runs only when the island's content changes, not on every animation tick.

```ts
type NodeIsland<N> = {
  render(node: LayoutNode<N>, viewport: Viewport, engine: Engine): ReactNode;
  anchor?: 'center' | 'top' | 'bottom' | { offset: Point };
  scaling?: 'fixed-pixel' | 'world' | 'hybrid';
  passthrough?: boolean; // pointer-events: none → events fall through
  show?: (viewport: Viewport) => boolean;
};

type EdgeIsland<N, E> = {
  render(edge: LayoutEdge<N, E>, path: Path, viewport: Viewport, engine: Engine): ReactNode;
  anchor?: 'midpoint' | { t: number } | ((path: Path) => Point); // along router-supplied path
  scaling?: NodeIsland<any>['scaling'];
  passthrough?: boolean;
  show?: (viewport: Viewport) => boolean;
};
```

`render` is memoized on `(id, data, viewport.scale-bucket)` so position updates never re-invoke React.

The overlay layer maintains a stable `id → ReactNode + ref` map. On `engine.frame` events it imperatively writes `el.style.transform`. New/removed islands trigger React updates; moves do not.

Edge islands ride on the router's `labelPoint(t, path)` — the engine never re-derives geometry; it reads the same path the renderer drew.

**Scaling:** `fixed-pixel` islands get `translate()` only — constant CSS dimensions. `world` adds `scale(viewport.scale)`. `hybrid` lets the handler split: wrapper fixed-pixel, inner content scaled.

**Hit testing:** islands are real DOM. Default `pointer-events: auto` — clicks on a popover/button/input use React's native event model. `passthrough: true` sets `pointer-events: none` on the wrapper.

**Culling:** islands are virtualized — only ones whose bounds plus a margin fall inside the viewport are mounted.

**Transition lock-step:** during projector animation, the island wrapper's CSS transform is tweened by the same `TweenService` as the node — no per-island JS animation.

**Opt-out:** engine option `htmlOverlay: false` skips the layer entirely (export, thumbnails, headless use).

## Projector & EdgeRouter contracts

```ts
abstract class Projector<N, E> {
  abstract onUpdate(graph: Graph<N, E>): void; // model changed
  abstract onTick(dt: number): boolean; // returns true if still animating
  abstract findNode(x: number, y: number, r: number): LayoutNode<N> | undefined;

  // Layout hints surfaced to routers (e.g. hierarchy depth, radial sector).
  getNodeHint?(id: string): unknown;
}

interface EdgeRouter<N, E> {
  route(edge: LayoutEdge<N, E>, projector: Projector<N, E>): Path;
  labelPoint(t: number, path: Path): Point; // for edge islands and bullets
}
```

Projectors emit _targets_ into the TweenService for nodes; they don't tween directly. The `ForceProjector` is the exception in that it runs a per-frame simulation and republishes a fresh target each tick — the TweenService treats every tick as a re-target with near-zero remaining duration, which converges to "render where the sim says". This keeps the loop uniform without fighting d3-force's natural shape.

## TweenService (hybrid animation)

- Single d3-timer; ~60fps.
- Per-entity state: `{ current, target, source, t, duration, easing }`.
- Projectors publish targets via `tween.setTarget(id, layout, opts?)`.
- Force-style projectors call `tween.setTarget(id, layout, { duration: 0 })` each tick — they own the simulation; the service owns the render clock.
- For projection switches the service interpolates `source → target` with default easing; the projector becomes a target-publisher rather than an animator.

## Tools (interactions)

Cross-cutting gesture FSMs attached to the engine, dispatching via per-type capability flags plus per-type override hooks.

- `HoverTool` — pointermove → entity under cursor; emits `hover:enter`, `hover:leave`. Respects `capabilities.hoverable` and `onPointer` veto.
- `SelectTool` — pointerdown/up → toggle/replace selection; updates `SelectionModel`.
- `ZoomTool` — d3-zoom-driven wheel/pinch/pan; writes to `Viewport.transform`.
- _(Phase 2)_ `DragTool` — pointer-driven node drag with projector handoff (force sim pauses centering, etc.).
- _(Phase 2)_ `LinkTool` — drag from one node to another to create an edge; uses Foreground layer for in-progress wire.

Per-type `onPointer` runs after the Tool's gesture detection: types can decorate semantic events or veto them.

## Viewport

Pure state — no DOM:

```ts
class Viewport {
  size: Size;
  transform: ZoomTransform;
  scale: number; // derived
  worldToScreen(p: Point): Point;
  screenToWorld(p: Point): Point;
  visibleBounds(): Rect;
  frame: EventEmitter<{ t: number }>; // emitted each engine tick
  resized: EventEmitter<Size>;
}
```

## React API (sketch)

```tsx
const engine = useEngine({
  model, // ReactiveGraphModel
  registry, // TypeRegistry
  projector: new ForceProjector(),
  backend: 'canvas', // 'canvas' | 'svg'
  tools: ['hover', 'select', 'zoom'],
});

<GraphRoot engine={engine}>
  <GraphSurface /> {/* layers 0–2, 4 */}
  <HtmlOverlayLayer /> {/* layer 3 */}
</GraphRoot>;
```

`GraphRoot` provides `EngineContext`. `GraphSurface` mounts the correct DOM element (`<canvas>` or `<svg>`) for the backend, wires `ResizeObserver`, forwards pointer events to the engine's tools. `HtmlOverlayLayer` mounts the absolutely-positioned overlay div and manages island lifecycle.

## Phase 1 — DX evaluation slice

The point of Phase 1 is to write a real example exercising every novel concept and judge whether the API feels right before committing to the full scope.

### In scope

1. **`@dxos/graph-engine` skeleton:** `Engine`, `TypeRegistry`, `Viewport`, `TweenService`, `RenderBackend` + `DrawContext` + `Path`, `ForceProjector`, `StraightRouter`, `HoverTool` + `SelectTool` + `ZoomTool`.
2. **One backend: Canvas.** Forces the abstraction to be honest (no leaky d3-selection access). The existing v1 SVG renderer stays untouched as reference.
3. **HTML overlay layer:** full §HTML-islands scope — node islands + edge islands, fixed-pixel/world/hybrid scaling, viewport culling, `passthrough`, tween-synced transforms.
4. **`@dxos/react-ui-graph` v2** under `src/v2/`: `<GraphRoot>`, `<GraphSurface>` (canvas), `<HtmlOverlayLayer>`; hooks `useEngine`, `useViewport`, `useSelection`. One storybook with a force-layout demo plus a "node with React popover island" example.

### Out of scope (Phase 2+)

- SVG backend port (the abstraction is proven by Canvas first).
- Other projectors (radial, hierarchical, relational) — the `Projector` base is fully defined so they port without contract churn.
- `DragTool`, `LinkTool`.
- Other routers (bezier, orthogonal, radial-arc).
- Subgraph hulls, markers, bullets, mesh, grid as engine concerns (continue using v1 SVG components if needed in stories).
- Migration of existing v1 callers (composer, plugins). v1 stays untouched.
- Export, hit-test quadtree (linear scan is fine at Phase 1 graph sizes).

### DX evaluation checklist

Concrete things to verify after Phase 1 to judge whether the design is right:

- [ ] Define a custom node type with a React-island popover that updates when data changes but doesn't re-render on every animation frame.
- [ ] Register two node types with different `lod` policies; confirm fixed-pixel and world-scale render correctly under zoom.
- [ ] Mount a `GraphSurface` with a `ReactiveGraphModel`, mutate the model, watch updates animate.
- [ ] Hover a node; see the registry's hover handler fire and a tool emit a semantic event.
- [ ] Swap projector instance at runtime; see TweenService interpolate.
- [ ] Read `engine.viewport.scale` from a handler/island and conditionally render based on zoom.
- [ ] Attach an HTML island to an edge anchored at the midpoint; confirm it tracks during projector animation.

## Open questions (deferred to plan or later phases)

- **Selection model** — keep `SelectionModel` from `@dxos/graph` as the canonical store, or move into the engine? Working assumption: keep external, engine references it.
- **Hit-test acceleration** — linear in Phase 1; quadtree (or backend-specific offscreen colour-buffer hit test for Canvas) deferred.
- **Coordinate units** — v1 uses fractional model space scaled by `gridSize`; Phase 1 normalizes to world units (floats). Migration of v1 fractional uses considered in Phase 2.
- **HiDPI** — Canvas backend handles `devicePixelRatio` in Phase 1. SVG backend doesn't need to.
- **Export of islands** — out of scope; addressable later via `html-to-image` composite.
