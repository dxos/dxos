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

export const defaultGroup = ({
  elevation,
  rounding,
  spacing
}: {
  elevation: Elevation;
  rounding?: string;
  spacing?: string;
}) => {
  return cx(
    rounding ?? 'rounded-lg',
    spacing ?? 'p-4',
    elevation === 0
      ? 'bg-transparent border border-neutral-200 dark:border-neutral-700'
      : 'bg-white dark:bg-neutral-800 elevated-buttons',
    elevationClassNameMap.get(elevation)
  );
};
