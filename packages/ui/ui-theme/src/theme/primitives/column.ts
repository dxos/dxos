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
  return mx('dx-column w-full min-w-0 grid', ...etc);
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

const columnViewport: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(...etc);
};

export const columnTheme = {
  root: columnRoot,
  row: columnRow,
  viewport: columnViewport,
};
