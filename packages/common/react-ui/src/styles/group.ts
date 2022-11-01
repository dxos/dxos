//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';

import { Elevation } from '../props';

const elevationClassNameMap = new Map<number, string>([
  [0, 'shadow-none'],
  [1, 'shadow-sm'],
  [2, 'shadow'],
  [3, 'shadow-md'],
  [4, 'shadow-lg'],
  [5, 'shadow-xl'],
  [6, 'shadow-2xl']
]);

export const defaultGroup = ({ elevation }: { elevation: Elevation }) => {
  return cx(
    'rounded-lg p-4',
    elevation === 0
      ? 'bg-transparent border border-neutral-200 dark:border-neutral-700'
      : 'bg-white dark:bg-neutral-800 elevated-buttons',
    elevationClassNameMap.get(elevation)
  );
};
