//
// Copyright 2022 DXOS.org
//

import { Elevation } from '../props';
import { mx } from '../util';

const elevationClassNameMap = new Map<Elevation, string>([
  ['base', 'shadow-none'],
  ['group', 'shadow-lg'],
  ['chrome', 'shadow-xl']
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
  return mx(
    rounding ?? 'rounded-lg',
    spacing ?? 'p-4',
    elevation === 'base'
      ? 'bg-transparent border border-neutral-200 dark:border-neutral-700'
      : 'bg-white dark:bg-neutral-800',
    elevationClassNameMap.get(elevation)
  );
};
