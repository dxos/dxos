//
// Copyright 2026 DXOS.org
//

import { type Size } from '@dxos/react-ui/next';

import { type MenuActions } from '../types.ts';

/** The binding's icon sizes are the current Icon's spacing steps; Next names the step of each size's icon scale. */
const ICON_SIZES: Partial<Record<NonNullable<MenuActions['iconSize']>, Size>> = {
  3: 'xs',
  3.5: 'sm',
  4: 'md',
  5: 'lg',
  6: 'xl',
};

/** The Next size for a `MenuActions.iconSize`; `undefined` (the scope's icon size) for a step with no Next size. */
export const iconSizeOf = (size: MenuActions['iconSize']): Size | undefined =>
  size === undefined ? undefined : ICON_SIZES[size];
