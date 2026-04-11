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
 */
const columnContent: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-full grid grid-cols-subgrid min-h-0 [&>:not(.dx-container)]:col-start-2', ...etc);
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
  viewport: columnViewport,
  row: columnRow,
};
