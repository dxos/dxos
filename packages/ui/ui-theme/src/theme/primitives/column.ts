//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

export type ColumnStyleProps = {
  fullWidth?: boolean;
  center?: boolean;
};

const columnRoot: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('dx-column grid', ...etc);
};

/**
 * Full-width content area that inherits the parent Column.Root's 3-column grid via subgrid.
 * Non-scrolling children default to column 2 (center, between gutters).
 * ScrollArea children span all 3 columns via the existing `[.dx-column_&]:col-span-full` selector.
 * This avoids padding/overflow conflicts — gutters come from the grid, not padding.
 *
 * @deprecated The `.dx-container` auto-bleed sniff is a hidden contract and fails when the direct
 * DOM child is transparent (`display: contents`, context-only compound components like `Editor.Root`,
 * `Form.Root`, etc.). For new code, prefer explicit placement via `Column.Center` or `Column.Bleed`.
 */
const columnContent: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-full grid grid-cols-subgrid min-h-0 [&>:not(.dx-container)]:col-start-2', ...etc);
};

/**
 * Center placement: places the element in column 2 (the central track between gutters) of the
 * parent Column.Root grid. Unlike `columnContent`, this does NOT use subgrid and does NOT sniff
 * for `.dx-container` children — placement is explicit on this element only.
 * Safe to nest arbitrary compound components (including those that render `display: contents`).
 */
const columnCenter: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-start-2 col-span-1 min-h-0', ...etc);
};

/**
 * Bleed placement: spans all 3 columns of the parent Column.Root grid (gutter-to-gutter).
 * Use for `ScrollArea`, full-width dividers, tables, or any content that should ignore gutters.
 */
const columnBleed: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-full min-h-0', ...etc);
};

const columnViewport: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(...etc);
};

/**
 * Three-column icon-slot row: spans all 3 columns of the parent Column.Root grid.
 * Uses CSS subgrid to inherit column sizing from the parent Column.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const columnRow: ComponentFunction<ColumnStyleProps> = ({ fullWidth, center }, ...etc) => {
  return mx('col-span-3 grid grid-cols-subgrid', fullWidth ? 'col-span-3' : center && 'col-start-2 col-span-1', ...etc);
};

export const columnTheme = {
  root: columnRoot,
  content: columnContent,
  center: columnCenter,
  bleed: columnBleed,
  viewport: columnViewport,
  row: columnRow,
};
