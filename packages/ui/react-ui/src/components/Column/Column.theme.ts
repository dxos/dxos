//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { withColumn } from './withColumn';

export type ColumnStyleProps = {};

const root: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('dx-column-root grid', ...etc);
};

/**
 * Three-column icon-slot row: spans all 3 columns of the parent Column.Root grid.
 * Uses CSS subgrid to inherit column sizing from the parent Column.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const row: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-3 grid grid-cols-subgrid', ...etc);
};

/**
 * Bleed placement: spans all 3 columns of the parent Column.Root grid (gutter-to-gutter).
 * Use for `ScrollArea`, full-width dividers, tables, or any content that should ignore gutters.
 */
const bleed: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-full grid grid-cols-subgrid min-h-0', ...etc);
};

/**
 * Center placement: places the element in column 2 (the central track between gutters) of the
 * parent Column.Root grid. Does NOT use subgrid — placement is explicit on this element only.
 * Safe to nest arbitrary compound components (including those that render `display: contents`).
 */
const center: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(withColumn.center(), 'min-h-0', ...etc);
};

export const columnTheme = {
  root,
  row,
  bleed,
  center,
};
