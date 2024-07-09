//
// Copyright 2024 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type TreegridStyleProps = Partial<{
  level: number;
}>;

const levelStyles = new Map<number, string>([
  [1, '[&>[role=gridcell]:first-of-type]:pis-0 font-medium'],
  [2, '[&>[role=gridcell]:first-of-type]:pis-0'],
  [3, '[&>[role=gridcell]:first-of-type]:pis-1'],
  [4, '[&>[role=gridcell]:first-of-type]:pis-2'],
  [5, '[&>[role=gridcell]:first-of-type]:pis-3'],
  [6, '[&>[role=gridcell]:first-of-type]:pis-4'],
  [7, '[&>[role=gridcell]:first-of-type]:pis-5'],
  [8, '[&>[role=gridcell]:first-of-type]:pis-6'],
]);

export const treegridRoot: ComponentFunction<TreegridStyleProps> = (_, ...etc) => mx('grid', ...etc);

export const treegridRow: ComponentFunction<TreegridStyleProps> = ({ level = 1 }, ...etc) =>
  mx('contents', levelStyles.get(Math.min(Math.max(Math.round(level), 1), 8)), ...etc);

export const treegridCell: ComponentFunction<TreegridStyleProps> = (_, ...etc) => mx(...etc);

export const treegridTheme: Theme<TreegridStyleProps> = {
  root: treegridRoot,
  row: treegridRow,
  cell: treegridCell,
};
