# react-ui-board — Testing & component overview

This package exposes a single board composite, **`Board`** — a gridstack-style board of draggable,
resizable tiles. It was unified from the former `Board` (free-placement canvas) and `Grid`
(auto-arranging gridstack): every difference between them reduced to configuration (see
[`DESIGN.md`](./DESIGN.md)), so there is now one component with a **pluggable drop resolver**.

Interactive drag/resize can't be synthesized in automation (native HTML5 DnD), so gestures ship a
**manual** test plan: [`src/components/Board/TESTING.md`](./src/components/Board/TESTING.md).
Everything else (engine, geometry, render, wiring) is covered headless by build/lint and the engine
unit suite — `moon run react-ui-board:test`.

## Composite

`Board.{Root, Container, Viewport, Content, Backdrop, Cell}` — a Radix composite over a cell grid
built on the universal DnD core (`Dnd.Root`). Core interactions: drag a tile by its handle,
`+`-to-add on empty backdrop cells, per-tile delete, imperative `center(cell?)`, edge auto-scroll,
snap-to-grid scrolling, live neighbour reflow with a `settleDelay`, and a controlled `zoom` overview
(scales down, disables drag/resize).

## Drop resolvers (behaviour presets — none allow overlaps)

The `resolver` prop selects what a drop/resize does; it returns the next layout or `null` to reject
(the tile springs back):

| Resolver                  | Behaviour                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `pushToFit` **(default)** | Place at the target; push occupants right/down; optional `pack` compaction.              |
| `resizeToFit`             | Place at the target; shrink the dropped tile to the free space; reject if 1×1 won't fit. |
| `rejectIfNoFit`           | Place only if the footprint fits in free space within bounds; else reject.               |

`plugin-board` uses `resizeToFit`; the storybook default uses `pushToFit`.

## Layout & bounds

- `layout: { items: Record<id, { x, y, w?, h? }> }` — positions keyed by object id (w/h default 1×1).
  This matches `plugin-board`'s persisted `layout.cells`, so no schema migration was required.
- `bounds: { columns?, rows? }` — `columns` bounds the horizontal axis; `rows` is a minimum the board
  grows past. Omit `columns` to derive width from content.

## Deferred (follow-ups)

- Pluggable coordinate-origin projection (top-left vs centre) — the old Board's signed centre origin
  is currently normalized to 0-based at the `plugin-board` boundary.
- 8-way resize handles; pinch-to-zoom.
- Migrate the `plugin-board` toolbar to `Menu.Root` + `useMenuActions` (currently a plain `Toolbar`).

## If something's off

Open DevTools console and drag; the `Dnd.Root` monitor logs `Root.onDrop { source, location }` and
warns on invalid target/source — paste those lines to pinpoint whether the drop routed and to where.
