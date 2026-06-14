//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { withColumn } from './withColumn';

export type ColumnStyleProps = {};

export type ColumnBlockStyleProps = {
  compact?: boolean;
  /** Constrain to a square (1:1) slot rather than the default rail-item width. */
  square?: boolean;
};

const root: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('dx-column-root grid', ...etc);
};

/**
 * Three-column subgrid row spanning all 3 columns of the parent Column.Root grid.
 * Children are placed by `data-slot`, not by source order:
 * - `start` → column 1 (leading gutter)
 * - `end`   → column 3 (trailing gutter)
 * - anything without a `data-slot` (anonymous content) → column 2 (center)
 * Attribute-driven placement is robust to conditional children (a falsy leading slot
 * never shifts content into a gutter).
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const row: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(
    'col-span-3 grid grid-cols-subgrid',
    '[&>[data-slot=start]]:col-start-1',
    '[&>[data-slot=end]]:col-start-3',
    '[&>*:not([data-slot])]:col-start-2',
    ...etc,
  );
};

/**
 * Gutter slot geometry: a `--dx-rail-item` square that centers its child, so a passive
 * `<Icon>` and an interactive `IconButton` line up to the pixel. Column placement (1/3) is
 * applied by the parent `row` via `data-slot`.
 */
const block: ComponentFunction<ColumnBlockStyleProps> = ({ compact, square }, ...etc) =>
  mx(
    'grid place-items-center [&>img]:max-w-[1.5rem]',
    square ? 'aspect-square' : 'w-[var(--dx-rail-item)]',
    compact ? '' : 'h-[var(--dx-rail-item)]',
    ...etc,
  );

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
  block,
  bleed,
  center,
};
