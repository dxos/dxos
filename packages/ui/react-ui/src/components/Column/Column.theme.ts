//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { withColumn } from './withColumn';

export type ColumnStyleProps = {};

export type ColumnBlockStyleProps = {
  /** Trailing gutter (column 3) instead of the default leading gutter (column 1). */
  end?: boolean;
  compact?: boolean;
  /** Constrain to a square (1:1) slot rather than the default rail-item width. */
  square?: boolean;
};

const root: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('dx-column-root grid', ...etc);
};

/**
 * Three-column subgrid row spanning all 3 columns of the parent Column.Root grid.
 * Placement is explicit, not source-order based:
 * - `Column.Block` self-places into column 1 (leading) or column 3 (trailing, `end`) and
 *   carries the `dx-gutter` marker class.
 * - Every other (content) child is placed in column 2 via `[&>*:not(.dx-gutter)]`.
 * Class-based placement (rather than `[data-slot=…]`) is used because Tailwind does not
 * generate arbitrary variants that nest a square-bracket attribute selector.
 * Robust to conditional children: a falsy leading slot never shifts content into a gutter.
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const row: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-3 grid grid-cols-subgrid', '[&>*:not(.dx-gutter)]:col-start-2', ...etc);
};

/**
 * Gutter slot geometry: a `--dx-rail-item` square that centers its child, so a passive
 * `<Icon>` and an interactive `IconButton` line up to the pixel. Self-places into column 1
 * (default) or column 3 (`end`); the `dx-gutter` marker keeps it out of the content track.
 */
const block: ComponentFunction<ColumnBlockStyleProps> = ({ end, compact, square }, ...etc) =>
  mx(
    'dx-gutter grid place-items-center [&>img]:max-w-[1.5rem]',
    end ? 'col-start-3' : 'col-start-1',
    square && 'aspect-square',
    !compact && 'h-[var(--dx-rail-item)]',
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
