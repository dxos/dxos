# Board / Grid Unification — Design

Status: **draft** · Date: 2026-07-11 · Scope: `@dxos/react-ui-board`, `@dxos/plugin-board`

## Summary

`@dxos/react-ui-board` currently ships **two** board composites:

- **`Board`** — a free-placement, centre-origin canvas (fixed extent, overlaps
  allowed, no rearrange, zoom/overview). Predates the universal DnD core.
- **`Grid`** — an auto-arranging gridstack (top-left origin, column-bounded,
  collision push / pack / float, resize, `settleDelay`), built on `Dnd.Root`
  (PR #12165).

A 1×1 walk-through of every way they differ (see _Aspect analysis_) concluded
they are **not two components** — every difference is either cosmetic or a
policy that belongs behind a prop. This doc specifies **one** component that
subsumes both, keeping the name **`Board`** (the `Grid` name is reserved for the
lit data-table component). `Grid` as a public name is dropped; its engine and
composite live on inside `Board`.

The keystone is a **pluggable drop resolver**: the strategy that decides what a
drop does (reject / resize-to-fit / push others / grow the board) is a supplied
function, with sensible built-ins. **No built-in resolver allows overlaps** — so
old-Board's free-overlap placement is intentionally retired.

### Non-goals

- Changing the DnD core (`Dnd.Root`) — done in PR #12165; this consumes it.
- Pinch-to-zoom (still deferred; scaled-space pointer math).
- 8-way resize handles (follow-up).
- Cross-container drag between a Board and other container types (future; the
  core already supports it, but no consumer needs it yet).

> Supersedes the note in `2026-07-10-universal-dnd-core-design.md` that Board's
> centre-origin/zoom would stay a separate concern — origin is now a projection
> prop on the unified component, and zoom an optional sub-feature.

## Aspect analysis (why one component)

Eleven differences were examined; all reduce to configuration:

| Aspect                                                                         | Verdict                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Coordinate origin (centre vs top-left)                                         | **Config** — a render-time projection `(pos) => Rect`.           |
| Extent (fixed canvas vs column-bounded)                                        | **Config** — `bounds` as a minimum + optional hard cap.          |
| Layout data model                                                              | **Unified** — `Record<id, {x,y,w?,h?}>` (already Board's shape). |
| Placement policy (free vs push)                                                | **Pluggable resolver** — the one real fork.                      |
| Resize · settleDelay · snap-scroll · zoom · toolbar · controller · auto-scroll | **Optional features** — props / opt-in sub-components.           |
| DnD substrate (raw pragmatic vs `Dnd.Root`)                                    | **Unified** — everything on `Dnd.Root`.                          |

Only **placement policy** was behavioural; a resolver absorbs it. With overlaps
disallowed everywhere, old-Board's distinguishing behaviour disappears.

## Design

### Generic core

The component is parameterized by a **position type** so consumers aren't locked
to `{x,y}`:

```ts
type GridPosition = { x: number; y: number; w?: number; h?: number }; // w/h default 1

type Layout<Pos> = { items: Record<string, Pos> }; // keyed by object id
type Projection<Pos> = (pos: Pos) => Rect; // cell coords -> px rect
type DropResolver<Pos> = (
  layout: Layout<Pos>,
  id: string,
  to: Pos,
  opts: { bounds?: Bounds; constraints?: Constraints },
) => Layout<Pos> | null; // null = reject (springs back)

const Board: <Pos = GridPosition>(props: BoardRootProps<Pos>) => ReactElement;
```

- **Layout** is a `Record<id, Pos>` — matches the existing `Board.layout.cells`
  ECHO shape, so `plugin-board` barely changes. Grid's array form (stories only)
  converts via `Object.entries`.
- Built-in resolvers/engine constrain `Pos extends GridPosition` (they need
  integer cell geometry). A consumer supplying an exotic `Pos` also supplies its
  own `projection` + `resolver`.

### Coordinate origin — projection prop

`origin?: 'top-left' | 'center'` (default `'top-left'`), or a full
`projection` callback for custom mappings. All placement already funnels through
one `cellRect()`; origin just offsets it by half the extent.

### Bounds & grow-to-fit

`bounds?: { columns?: number; rows?: number }` is a **minimum** — the backdrop
renders at least this, and the layout may exceed it (Grid's `minRows` already
behaves this way). Growth is the default. Optional
`maxColumns` / `maxRows` impose a hard cap; past it, resolvers reject or push
instead of growing. Omitting a dimension = unbounded on that axis.

### Drop resolvers (built-in — none allow overlaps)

| Resolver                  | Behaviour                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pushToFit` **(default)** | Place at `to`; push occupants right/down (`resolveCollisions`); optional `pack` compaction. Grows the board when it hits the min-edge (unless capped). |
| `resizeToFit`             | Place at `to`; if it collides/overflows, shrink the dropped tile to the largest free rect there; `null` if even 1×1 won't fit.                         |
| `rejectIfNoFit`           | Place only if the footprint fits in free space within bounds; else `null`.                                                                             |

`null` ⇒ the drop is rejected and the tile springs back — `previewLayout`
already keys off this (null preview → no movement), so rejection is uniform.

### Composite & optional features

`Board.{Root, Container, Viewport, Content, Backdrop, Cell, Toolbar}` (same shell
both have today). Optional, prop- or composition-gated:

- **Resize** — `Cell` renders the resize handle only when `resizable`.
- **`settleDelay`** — defer the resolver until the drag dwells (already built).
- **Snap-to-grid scroll**, **edge auto-scroll**, **`center()` controller** —
  shared, always on.
- **Zoom** — `Board.Toolbar` zoom toggle + viewport `scale`; opt-in.

### Presets

Exported config bundles so consumers don't re-specify:

- **default** — `{ origin:'top-left', resolver: pushToFit, resizable:true }`
  (today's Grid feel).
- **canvas** — `{ origin:'center', bounds:{columns:7,rows:5}, resolver:
resizeToFit, zoom:true }` (today's Board feel for `plugin-board`).

## Phasing (all within PR #12165)

1. **Engine → generic + resolvers.** Refactor `engine.ts` to operate on
   `Record<id,Pos>`; extract `pushToFit`/`resizeToFit`/`rejectIfNoFit` behind
   `DropResolver`. Port/extend the 33 unit tests (add resolver + grow cases).
2. **Rename & merge composite.** Fold the `Grid` composite into `Board`; add
   `origin` / `bounds` / `resolver` / `resizable` / zoom props. Reconcile
   `GridCell` ↔ `BoardCell` into one `Board.Cell`.
3. **Projection + bounds/grow** wiring in geometry + backdrop.
4. **Stories.** Port the four Grid stories + the Board (canvas) story onto the
   unified component.
5. **Rewire `plugin-board`.** `BoardArticle` → unified API + `canvas` preset;
   confirm the ECHO `cells` Record still round-trips (add resolver on drop).
6. **Delete** the old `Grid` and old `Board` internals fully (no shims — house
   rule). Update `TESTING.md`.

## Risks / open questions

- **Generic vs concrete geometry.** Built-in resolvers need integer cells;
  enforced by constraining `Pos extends GridPosition`. Exotic `Pos` ⇒ consumer
  supplies projection + resolver. Acceptable.
- **Cell reconciliation.** `GridCell` (resize, footprint outline, size-override)
  is the superset; `BoardCell` (select-on-click, delete) folds in. Verify the
  Card header layout stays intact under both.
- **Zoom × drag pixel math.** Zoom scales the viewport; drag/resize compute px
  from `getBoundingClientRect`, which already reflects scale — verify, since the
  old Board disabled drag while zoomed (`canDrag: !zoom`).
- **`plugin-board` data.** Existing boards may contain overlapping cells (old
  free placement). With no-overlap resolvers, first drag resolves them; initial
  render still shows overlaps until touched. Acceptable; note in migration.

## Testing

- Engine: unit tests per resolver (`pushToFit`/`resizeToFit`/`rejectIfNoFit`) +
  grow/cap + projection origin.
- Manual (native drag can't synthesize): unified plan in `TESTING.md` covering
  both presets.
