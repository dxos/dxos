# CellGrid — design

Status: Draft
Date: 2026-05-16
Package: `@dxos/react-ui-canvas`
Component: `CellGrid`

## Summary

A 2D scrolling grid React component where each cell is a simple shape (square/circle/etc.) drawn on an HTML5 Canvas. The grid is sparsely populated from an external model, scrolls on both axes, zooms on the x-axis, supports click-to-toggle / drag-to-select / drag-to-resize, and renders a smooth 60fps playhead overlay. Frozen header column (left) and ruler row (top) are rendered in the DOM.

Two initial consumers:

1. **Music sequencer** — cells are notes with `{ col, row, length, ... }`; playhead sweeps during playback.
2. **Data visualization** — cells are time-series data points; same `{ col, row, length }` shape.

## Goals

- One canvas-based grid engine reused across both consumers via a pluggable `renderCell` function.
- Sustain 60fps with an animated playhead at the targeted scale (≤ ~1k cells visible per viewport, ≤ ~10k total).
- No React re-renders in the hot render path.
- Headless render functions that are unit-testable against a mock `CanvasRenderingContext2D`.

## Non-goals

- Tile/offscreen-canvas caching of the static layer. The scale target does not justify it; revisit if measurements demand it.
- WebGL. Canvas 2D is sufficient.
- y-axis zoom. Row height is fixed.
- Native DOM `overflow: scroll`. We draw our own scrollbar so virtual width can be arbitrary without bloating the DOM.
- Accessibility tree for individual cells. Headers are accessible DOM; cells are canvas-only in v1.
- Touch-specific gestures beyond what `PointerEvent` provides for free.

## Constraints

- Lives in the existing `@dxos/react-ui-canvas` package alongside the existing `Canvas` and `Grid` components. No new package.
- State uses `@effect-atom/atom` (catalog dependency, already used by sibling UI packages).
- Tests use vitest, near the module under test (`*.test.ts`).
- Storybook story per use case.

## Renderer choice — why Canvas 2D

At the target scale (~1k visible cells, ~10k total):

| Option   | Verdict                                                                |
| -------- | ---------------------------------------------------------------------- |
| DOM      | One element per cell — repaints break under scrolling at this density. |
| SVG      | Workable, but layered animation (playhead) costs more than canvas.     |
| Canvas2D | **Chosen.** Predictable frame timing, simple API, easy layering.       |
| WebGL    | Overkill at this scale. Adds dependency weight (Pixi/regl).            |

## Architecture

### Layers

```
┌───┬───────────────────────────────┐
│   │  Top ruler (DOM)              │
├───┼───────────────────────────────┤
│ L │                               │
│ e │  ┌─────────────────────────┐  │
│ f │  │ static-cells <canvas>   │  │  ← redraws on (model, viewport, zoom) change
│ t │  ├─────────────────────────┤  │
│   │  │ overlay <canvas>        │  │  ← rAF loop while playing/interacting
│ D │  └─────────────────────────┘  │
│ O │                               │
│ M │  custom scrollbars (DOM)      │
└───┴───────────────────────────────┘
```

- **Static layer** — draws all visible cells. Subscribes to `cellsAtom` and `viewportAtom`. A change schedules one `requestAnimationFrame` redraw; multiple atom writes in the same tick coalesce into a single paint.
- **Overlay layer** — draws playhead, selection marquee (translucent fill + dashed border), resize handles, hover ring. Owns its own rAF loop that runs only while something is animating or being interacted with; self-terminates when idle. Selection visuals live entirely on this layer so a drag-select does not invalidate the static layer.
- **Headers** — plain React/DOM. Top ruler reads `viewportAtom` to position tick labels; left header lists row names from props. Tailwind/`@dxos/ui-theme` for styling.
- **Scrollbars** — custom DOM elements positioned over the canvas; they reflect `viewportAtom.scrollX/Y` and write back on drag. Avoids creating a virtual scroll surface as wide as the timeline.

Canvases are absolutely positioned, sized to the content rect (not the virtual world). Position within the world is a viewport transform applied at draw time.

### Coordinate spaces

- **World** — `{ col, row }` integer cell coordinates.
- **Viewport** — `{ scrollX, scrollY, cellWidth, cellHeight, zoomX }`. `cellWidth = baseCellWidth * zoomX`.
- **Screen** — pixels in the canvas. Header offsets (`headers.left`, `headers.top`) shift the cell origin.

Transforms:

- `worldToScreen({ col, row, length })` → `{ x, y, w, h }` in canvas pixels.
- `screenToWorld({ x, y })` → fractional `{ col, row }`; hit-test floors to nearest cell.
- `visibleCellRange(viewport, size)` → `{ minCol, maxCol, minRow, maxRow }` for iteration.

### State (`@effect-atom/atom`)

Per `<CellGrid>` instance, a factory builds:

- `cellsAtom: Atom<Map<string, Cell>>` — sparse map keyed by `` `${col},${row}` ``. Cells are `{ col, row, length, data }`.
- `viewportAtom: Atom<Viewport>` — `{ scrollX, scrollY, cellWidth, cellHeight, zoomX }`.
- `selectionAtom: Atom<Selection>` — `{ range?: { col0, row0, col1, row1 } }`.
- `playheadAtom: Atom<number | null>` — current playhead x in world units (col + fraction), or null.
- `toolAtom: Atom<'toggle' | 'select' | 'resize'>` — input mode.

Consumers may pass their own atoms (e.g., the sequencer plugin owns `cellsAtom` so it can persist via ECHO), or let the component create them. Either way the component reads/writes via atom handles, never via React state.

### Component API

```ts
type Cell<T = unknown> = { col: number; row: number; length: number; data?: T };

type RenderCell<T> = (args: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  cell: Cell<T>;
}) => void;

type CellGridProps<T = unknown> = {
  cells: Atom<Map<string, Cell<T>>>;
  viewport: Atom<Viewport>;
  selection: Atom<Selection>;
  playhead?: Atom<number | null>;
  tool: Atom<Tool>;
  rows: ReadonlyArray<{ id: string; label?: string }>;
  renderCell: RenderCell<T>;
  headers?: { left?: number; top?: number } | false; // default { left: 80, top: 24 }
  onCellToggle?: (coord: { col: number; row: number }) => void;
  onSelectionCommit?: (range: SelectionRange) => void;
  onResize?: (range: SelectionRange) => void;
  classNames?: ThemedClassName;
};
```

`renderCell` is the multi-use-case seam. The sequencer draws a rounded velocity-tinted rect; the data viz draws a circle sized by magnitude. Same engine, different drawing.

### Input handling

A single `PointerEvent` tracker on the overlay canvas:

1. `pointerdown` — convert to world coords; capture pointer; dispatch on `toolAtom`:
   - `toggle` — fire `onCellToggle`. If drag follows, stay on same row and toggle additional cells (paint).
   - `select` — start marquee at down-coord.
   - `resize` — only valid if the down-coord is on an edge of `selectionAtom.range`; otherwise falls through to `select`.
2. `pointermove` — update marquee / resize edge; write `selectionAtom`.
3. `pointerup` — commit (`onSelectionCommit` / `onResize`); release capture.

Wheel events: vertical → `scrollY`; cmd/ctrl+wheel → `zoomX` around cursor x; horizontal → `scrollX`.

Keyboard: arrows pan; cmd+arrows zoom; escape clears selection. (v1: minimum viable.)

### Render loop

Static layer (`useEffect`):

```
subscribe([cellsAtom, viewportAtom], () => scheduleStaticRedraw());

scheduleStaticRedraw = () => {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = null;
    drawCells(ctx, viewport.get(), cells.get(), renderCell);
  });
};
```

Overlay layer (`useEffect`):

```
const loop = () => {
  drawOverlay(ctx, viewport.get(), selection.get(), playhead.get());
  if (isAnimating()) rafId = requestAnimationFrame(loop);
};

subscribe([playheadAtom, selectionAtom], () => {
  if (!rafId) rafId = requestAnimationFrame(loop);
});
```

`isAnimating()` is true while playhead is non-null or a pointer drag is in progress.

The React tree only re-renders on identity changes to the atom props or to `rows` / `renderCell`. There is no per-frame React work.

## Module structure

```
packages/ui/react-ui-canvas/src/components/CellGrid/
  CellGrid.tsx              # React shell; mounts canvases + headers
  CellGrid.stories.tsx      # sequencer story + data-viz story
  CellGrid.test.ts          # integration: mount + drive atoms + read draw calls
  index.ts
  state/
    atoms.ts                # createCellGridAtoms() factory + types
    viewport.ts             # worldToScreen, screenToWorld, visibleCellRange
    viewport.test.ts
  render/
    static-layer.ts         # drawCells(ctx, viewport, cells, renderCell)
    static-layer.test.ts
    overlay-layer.ts        # drawOverlay(ctx, viewport, selection, playhead)
    overlay-layer.test.ts
  input/
    pointer.ts              # pointer → world → tool dispatch
    pointer.test.ts
    wheel.ts                # wheel/pinch → viewport update
  headers/
    Ruler.tsx               # top time ruler (DOM)
    TrackHeader.tsx         # left column (DOM)
```

`render/*` and `state/*` are pure modules — no React, no DOM. They take a `CanvasRenderingContext2D` (real or mock) and a plain state object.

## Testing

- **Pure render functions** — vitest with a hand-rolled mock `CanvasRenderingContext2D` that records calls. Snapshot the call sequence; assert primitive counts (e.g., "5 visible cells → 5 `fillRect` calls").
- **Viewport math** — plain vitest; round-trip `worldToScreen ∘ screenToWorld` and check `visibleCellRange` against fixtures.
- **Pointer / tool dispatch** — drive `pointer.ts` with synthetic events, assert atom transitions.
- **Component-level** — mount via testing-library, drive via the atoms, inspect the recorded ctx call log on the static layer. No visual assertions; render correctness is covered by Storybook.
- **Storybook** — two stories: `Sequencer` (rounded rects, playhead animating) and `DataViz` (circles, no playhead). These also serve as manual perf checks.

## Performance budget

- Static-layer paint @ 1k cells: target < 4ms on M-series MBP.
- Overlay paint @ 60fps with playhead + selection: target < 1ms per frame.
- Idle (no playback, no interaction): zero rAF callbacks running.

## Risks and open questions

- **DPR / HiDPI** — canvases must scale by `devicePixelRatio` on mount and resize. Easy to get wrong; covered in implementation.
- **Pointer coalescence on fast drags** — use `getCoalescedEvents()` for paint-mode drags so we don't miss cells.
- **Effect-atom React binding** — verify `@effect-atom/atom-react` exposes a low-overhead subscription API suitable for the static-layer effect (no per-render dependency arrays). If not, fall back to direct subscription via the atom runtime.
- **Custom scrollbar UX** — drawing our own scrollbar is a small UX hazard (keyboard accessibility, native look). Acceptable for v1; revisit if users complain.

## Out of scope (future)

- Tile cache on the static layer (if cell counts grow).
- Cell accessibility tree.
- Multi-row paint, lasso (free-form) selection, copy/paste.
- Touch pinch-zoom (pointer events give us most of it; native pinch on trackpad already works via wheel+ctrl).
- y-axis virtualization.
