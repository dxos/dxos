//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

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

export type ColumnStyleProps = {};

const columnRoot: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('dx-column-root grid', ...etc);
};

/**
 * Center placement: places the element in column 2 (the central track between gutters) of the
 * parent Column.Root grid. Does NOT use subgrid — placement is explicit on this element only.
 * Safe to nest arbitrary compound components (including those that render `display: contents`).
 */
const columnCenter: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(withColumn.center(), 'min-h-0', ...etc);
};

/**
 * Bleed placement: spans all 3 columns of the parent Column.Root grid (gutter-to-gutter).
 * Use for `ScrollArea`, full-width dividers, tables, or any content that should ignore gutters.
 */
const columnBleed: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-full grid grid-cols-subgrid min-h-0', ...etc);
};

/**
 * Three-column icon-slot row: spans all 3 columns of the parent Column.Root grid.
 * Uses CSS subgrid to inherit column sizing from the parent Column.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const columnRow: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-3 grid grid-cols-subgrid', ...etc);
};

export const columnTheme = {
  root: columnRoot,
  center: columnCenter,
  bleed: columnBleed,
  row: columnRow,
};
