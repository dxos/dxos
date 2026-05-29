//
// Copyright 2024 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

export type TreegridStyleProps = Partial<{
  level: number;
  indent: boolean;
}>;

const levelStyles = new Map<number, string>([
  [1, '[&>.indent:first-of-type]:pl-0 font-medium'],
  [2, '[&>.indent:first-of-type]:pl-0'],
  [3, '[&>.indent:first-of-type]:pl-1'],
  [4, '[&>.indent:first-of-type]:pl-2'],
  [5, '[&>.indent:first-of-type]:pl-3'],
  [6, '[&>.indent:first-of-type]:pl-4'],
  [7, '[&>.indent:first-of-type]:pl-5'],
  [8, '[&>.indent:first-of-type]:pl-6'],
]);

const root: ComponentFunction<TreegridStyleProps> = (_, ...etc) => mx('grid', ...etc);

const row: ComponentFunction<TreegridStyleProps> = ({ level = 1 }, ...etc) =>
  mx(levelStyles.get(Math.min(Math.max(Math.round(level), 1), 8)), ...etc);

const cell: ComponentFunction<TreegridStyleProps> = ({ indent }, ...etc) => mx(indent && 'indent', ...etc);

export const treegridTheme: Theme<TreegridStyleProps> = {
  root,
  row,
  cell,
};
