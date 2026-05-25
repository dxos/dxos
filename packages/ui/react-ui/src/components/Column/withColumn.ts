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
 */
export const withColumn = {
  /** Centers element in the Column grid via --dx-col. No-op outside Column or inside ScrollArea. */
  center: () => '[grid-column:var(--dx-col,auto)]',

  /** Propagates the Column grid to children via subgrid. No-op outside Column.
   *  Direct children default to center column unless they are a dx-container (ScrollArea). */
  propagate: () =>
    '[.dx-column-root_&]:col-span-full [.dx-column-root_&]:grid [.dx-column-root_&]:grid-cols-subgrid [.dx-column-root_&]:[&>*:not(.dx-container)]:[grid-column:var(--dx-col,auto)]',

  /** Resets --dx-col after consuming --gutter. Applied by ScrollArea.Viewport. */
  consumed: () => '[--dx-col:auto]',
};
