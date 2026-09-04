//
// Copyright 2026 DXOS.org
//

/**
 * Column-aware theme utilities.
 * Components apply these in their theme functions to participate in the Column grid
 * without importing Column React components.
 *
 * CSS custom property cascade:
 * - Column.Root sets `--dx-col: 2 / span 1` (center column placement).
 * - ScrollArea.Viewport resets `--dx-col: auto` after consuming `--gutter`.
 * - Components apply `grid-column: var(--dx-col, auto)` to auto-center in Column
 *   or do nothing outside Column / inside ScrollArea.
 *
 * ## Which one to use
 *
 * Three placement mechanisms coexist because they solve different problems. An earlier plan was to
 * collapse them onto `--dx-col` alone; that was tried and abandoned — the other two are each the
 * only way to express their case (see AUDIT.md §3).
 *
 * | Mechanism         | Places                        | Reach for it when                                  |
 * | ----------------- | ----------------------------- | -------------------------------------------------- |
 * | `center()`        | the element itself            | one element belongs in the content track            |
 * | `placeContent()`  | the element's children        | a subgrid row mixes gutter slots with content       |
 * | `propagate()`     | opens the tracks to children  | a child must reach the gutters                      |
 *
 * - **`center()`** is inheritance-based, so it survives a `display: contents` wrapper — the case
 *   where a child selector or subgrid silently fails. Prefer it whenever it is sufficient.
 * - **`placeContent()`** needs the element to already be a subgrid row (`col-span-3 grid
 *   grid-cols-subgrid`). It reaches grandchildren too, so a wrapper element (a link, a button)
 *   doesn't strand its content in column 1.
 * - **`propagate()`** is the only one that lets a *descendant* address the gutters: it spans the
 *   element across all tracks and re-exposes them via subgrid, with `dx-scroll-boundary` exempted so a
 *   ScrollArea can span full width and keep its scrollbar in the gutter. `Dialog.Body` depends on
 *   this — replacing it with `center()` confines the body's ScrollArea to the content track and
 *   pulls the scrollbar 32px inboard.
 */
export const withColumn = {
  /**
   * Centers element in the Column grid via --dx-col. No-op outside Column or inside ScrollArea.
   */
  center: () => '[grid-column:var(--dx-col,auto)]',

  /**
   * Places a subgrid row's content children in the center track, leaving `.dx-gutter` slots to
   * their own explicit `col-start`. Covers grandchildren too, so a wrapper element (a link, a
   * button) doesn't strand its content in column 1 — and excludes gutters at that depth as well,
   * since a `display: contents` wrapper promotes its children into this grid.
   */
  placeContent: () => '[&>*:not(.dx-gutter)]:col-start-2 [&>*:not(.dx-gutter)>*:not(.dx-gutter)]:col-start-2',

  /**
   * Propagates the Column grid to children via subgrid. No-op outside Column.
   * Direct children default to center column unless they are marked `dx-scroll-boundary`
   * (ScrollArea.Root), which spans the full width so its scrollbar sits in the gutter.
   */
  propagate: () =>
    '[.dx-column-root_&]:col-span-full [.dx-column-root_&]:grid [.dx-column-root_&]:grid-cols-subgrid [.dx-column-root_&]:[&>*:not(.dx-scroll-boundary)]:[grid-column:var(--dx-col,auto)]',

  /**
   * Resets --dx-col after consuming --gutter. Applied by ScrollArea.Viewport.
   */
  consumed: () => '[--dx-col:auto]',
};
