# Masonry Layout Engine — Design

- **Date:** 2026-07-04
- **Package:** `@dxos/react-ui-masonry`
- **Status:** Approved (design decisions locked)

## Summary

Replace the third-party `@virtuoso.dev/masonry` dependency with a self-contained
masonry layout engine inside `@dxos/react-ui-masonry`. The public `Masonry.Root /
Masonry.Content / Masonry.Viewport` API is preserved exactly (strict drop-in); only
the internals of `Masonry.Viewport` change. The new engine balances columns by
height (shortest-column-first) rather than by index, and animates reflow with FLIP.

## Motivation

`VirtuosoMasonry` assigns items to columns **by index** (`item i → column i %
columnCount`), so columns with tall items stay tall and short items never
backfill — the columns visibly fail to balance. It also pulls in an external
dependency whose scroll-container takeover requires a documented workaround
(`react-virtuoso#1305`) and whose column-first DOM order forces a Tabster
`axis: 'both'` navigation compromise. Owning the engine lets us:

1. Balance columns by measured height (the actual user complaint).
2. Drop the external dependency and its workarounds.
3. Control DOM order and animation (FLIP reflow).

## Goals

- **Strict drop-in.** No consumer change. `Masonry.Root/Content/Viewport` props
  (`Tile`, `columns`, `maxColumns`, `minColumnWidth`, `maxColumnWidth`, `gutter`,
  `items`, `getId`, `classNames`, ScrollArea passthrough) keep their current
  meaning. All 12 consumers compile and render unchanged.
- **Height-balanced columns** via column-major greedy assignment.
- **FLIP reflow animations** on layout change, gated on
  `prefers-reduced-motion`.
- **Remove** `@virtuoso.dev/masonry` from the package and the pnpm catalog.

## Non-goals

- **Virtualization.** Phase 1 renders all items. The engine is structured so a
  windowing layer can be added later (Phase 2) without touching the pure layout
  function or the public API. This is a deliberate seam, not a shipped feature.
- **Mobile-specific behavior.** No separate mobile layout path; responsive column
  count already flows from container width.
- Drag-and-drop reordering (out of scope; consumers that reorder do so above the
  Masonry layer).

## Public API (unchanged)

```tsx
<Masonry.Root Tile={Card} minColumnWidth={16} maxColumnWidth={24} gutter={0.75}>
  <Masonry.Content thin padding centered>
    <Masonry.Viewport items={items} getId={(x) => x.id} />
  </Masonry.Content>
</Masonry.Root>
```

`Masonry.Root` and `Masonry.Content` are unchanged. `useColumnCount` (container
width → column count, honoring `columns`/`maxColumns`/`min`/`maxColumnWidth`) is
kept verbatim — it already produces the right count; only how items are placed
into those columns changes.

## Architecture (Approach B — absolute layout engine)

Three concerns, separated:

### 1. Pure layout function

```ts
type Rect = { x: number; y: number; column: number };
type LayoutResult = { rects: Rect[]; columnWidth: number; height: number };

const layout = (opts: {
  heights: readonly number[]; // measured tile heights (px), item order
  columnCount: number;
  containerWidth: number;     // px, already net of scrollbar allowance
  gutterPx: number;
}): LayoutResult => { /* ... */ };
```

- `columnWidth = (containerWidth - (columnCount - 1) * gutterPx) / columnCount`.
- **Column-major greedy (shortest-column-first):** maintain a `columnHeights`
  array initialized to 0. For each item in order, place it in the column with the
  smallest running height (ties → lowest index for stable order), set
  `x = column * (columnWidth + gutterPx)`, `y = columnHeights[column]`, then
  `columnHeights[column] += height + gutterPx`.
- `height = max(columnHeights) - gutterPx` (trailing gutter trimmed).
- Pure and synchronous → directly unit-testable with no DOM.

### 2. Measurement

- Each tile renders into an absolutely-positioned wrapper. A single
  `ResizeObserver` (created once, reused) observes every tile wrapper and reports
  height by item id.
- Heights are stored in a ref-backed map keyed by `getId(item)` (fallback to
  index when `getId` is absent). A state counter/version triggers re-layout when
  a height changes past a small epsilon (avoid thrash on sub-pixel jitter).
- Container width comes from the existing `Masonry.Content` width context
  (`react-resize-detector`), net of the scrollbar allowance already subtracted in
  the current Viewport.
- **First paint:** before heights are known, render tiles at their natural flow
  position (visibility-safe) so the observer can measure; apply absolute
  positioning once measured. Guard `width <= 0` returns null (as today).

### 3. Positioning + FLIP

- The Viewport container is `position: relative`, `height` set to the layout
  result height. Each tile wrapper is `position: absolute; width: columnWidth;
  transform: translate(x, y)`.
- **FLIP:** on layout change, capture previous `translate` per id (First), apply
  the new one (Last), then animate the delta via the Web Animations API
  (`element.animate([{ transform: prev }, { transform: next }], { duration,
  easing })`). New items fade/scale in; removed items are dropped immediately
  (no exit animation in Phase 1).
- **Reduced motion:** if `matchMedia('(prefers-reduced-motion: reduce)')`
  matches, skip animation and snap to the new transform.

### Component structure

```
src/
  Masonry.tsx            # Root, Content, Viewport (public namespace) — unchanged shells
  layout.ts             # pure layout() + types
  layout.test.ts        # unit tests for balancing/geometry
  useMasonryLayout.ts   # hook: wires ResizeObserver + layout() + version state
  useFlip.ts            # hook: FLIP transitions keyed by id, reduced-motion aware
```

`Masonry.Viewport` composes `useMasonryLayout` (heights + rects) and `useFlip`
(animate on rect change), rendering absolutely-positioned tile wrappers inside
`ScrollArea.Viewport`. Arrow-key navigation keeps `useArrowNavigationGroup`, but
because DOM order can now follow item order (not column-first), revisit the axis:
if tiles render in item order left-to-right within the flow, `axis: 'grid-linear'`
may be usable; default to preserving `axis: 'both'` to avoid regressing
navigation, and note the option in code.

## Data flow

1. `Masonry.Content` measures container width → context.
2. `Masonry.Viewport` computes `columnCount` via `useColumnCount(width, …)`.
3. Tiles render; `ResizeObserver` reports each tile height by id.
4. `layout({ heights, columnCount, containerWidth, gutterPx })` → rects.
5. Wrappers positioned via `translate`; `useFlip` animates deltas.
6. Any change to items/width/columnCount/heights recomputes steps 3–5.

## Edge cases

- **Unmeasured tiles:** treated as height 0 until first measure; layout settles on
  the next observer callback (one reflow). Acceptable; no layout thrash loop
  because height writes are epsilon-gated.
- **Single column / `columns=1`:** degenerates to a vertical stack; layout handles
  `columnCount=1` naturally.
- **Zero items:** height 0, renders empty viewport (matches today).
- **`width <= 0`:** returns null (matches today), avoids divide-by-zero.
- **Item removal/reorder:** rects recompute from current `items`; FLIP animates
  survivors, new ids appear, missing ids are removed.
- **Very tall single item:** column-major greedy still balances the rest around
  it; no special-casing.

## Testing

- **`layout.test.ts` (pure, no DOM):**
  - shortest-column assignment: given heights `[10, 10, 100, 10]`, `columnCount=2`,
    item 3 lands in the column made shorter by item order, not `index % 2`.
  - geometry: `x`/`columnWidth` account for gutter; total `height = max column −
    trailing gutter`.
  - `columnCount=1` stacks vertically; empty input → height 0.
  - stable tie-breaking (equal heights → lowest column index).
- **Component/story smoke:** existing `Masonry.stories.tsx` re-pointed to the
  generator fixtures (see below); verify in Storybook that columns balance and
  reflow animates. Follow repo rule: don't kill the user's :9009 server — reuse or
  use an alternate port.
- **Consumer build:** `moon run <each-consumer>:build` stays green (drop-in).

## Story fixtures

Update `Masonry.stories.tsx` to generate items with the same `@dxos/schema/testing`
+ `@dxos/random` person generator used in the CRM `CollectionArticle` story
(#12084), enriching `jobTitle`/`department`/`image`/`emails` locally in the story
so cards have varied heights that exercise balancing. Do **not** add generator
annotations to shared schemas.

## Migration / rollout

- Remove `@virtuoso.dev/masonry` from `packages/ui/react-ui-masonry/package.json`
  and delete the catalog entry in `pnpm-workspace.yaml` (preserve surrounding
  comments), then `pnpm install`.
- No consumer edits (strict drop-in). Validate with a full build + the consumers'
  storybooks/tests.
- The `VirtuosoMasonry` wrapper and the `react-virtuoso#1305` workaround comment
  are deleted.

## Risks

- **Measurement flicker on first paint** — mitigated by measuring in flow then
  switching to absolute; if visible, add a one-frame opacity gate.
- **Navigation regression** — mitigated by keeping `axis: 'both'` unless verified
  otherwise.
- **Perf with many items (no virtualization)** — Phase 1 renders all; acceptable
  for current consumer sizes (galleries/collections of tens–low hundreds). The
  pure `layout()` seam allows Phase 2 windowing without API change.
