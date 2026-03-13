//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

const columnRoot: ComponentFunction<Record<string, any>> = (_, ...etc) => mx('dx-column w-full min-w-0 grid', ...etc);

/**
 * Three-column icon-slot row: spans all 3 columns of the parent Column.Root grid.
 * Uses CSS subgrid to inherit column sizing from the parent Column.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 */
const columnRow: ComponentFunction<Record<string, any>> = (_, ...etc) =>
  mx('col-span-3 grid grid-cols-subgrid', ...etc);

/**
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 * Occupies only the center column (col-2) of the parent Column.Root grid.
 */
const columnSegment: ComponentFunction<Record<string, any>> = (_, ...etc) =>
  mx('col-start-2 col-span-1 min-w-0', ...etc);

export const columnTheme = {
  root: columnRoot,
  row: columnRow,
  segment: columnSegment,
};
