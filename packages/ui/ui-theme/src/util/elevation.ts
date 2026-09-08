//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment, type Elevation, type SurfaceLevel } from '@dxos/ui-types';

export const surfaceShadow: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'positioned'
    ? 'shadow-sm'
    : elevation === 'dialog' || elevation === 'toast'
      ? 'shadow-md'
      : 'shadow-none',
];

export const surfaceZIndex: ComponentFragment<{ level?: SurfaceLevel; elevation?: Elevation }> = ({
  level,
  elevation,
}) => {
  switch (level) {
    case 'tooltip':
      return elevation === 'dialog' ? ['z-[53]'] : elevation === 'toast' ? ['z-[43]'] : ['z-50'];
    case 'menu':
      return elevation === 'dialog' ? ['z-[52]'] : elevation === 'toast' ? ['z-[42]'] : ['z-20'];
    default:
      return elevation === 'dialog' ? ['z-[51]'] : elevation === 'toast' ? ['z-[41]'] : ['z-[1]'];
  }
};

/**
 * The same layer as {@link surfaceZIndex}, handed over as `--z-index` for an element whose inline
 * style reads the variable (a Zag positioner) and so ignores a `z-*` class.
 */
export const surfaceZIndexVar: ComponentFragment<{ level?: SurfaceLevel; elevation?: Elevation }> = ({
  level,
  elevation,
}) => {
  switch (level) {
    case 'tooltip':
      return elevation === 'dialog'
        ? ['[--z-index:53]']
        : elevation === 'toast'
          ? ['[--z-index:43]']
          : ['[--z-index:50]'];
    case 'menu':
      return elevation === 'dialog'
        ? ['[--z-index:52]']
        : elevation === 'toast'
          ? ['[--z-index:42]']
          : ['[--z-index:20]'];
    default:
      return elevation === 'dialog'
        ? ['[--z-index:51]']
        : elevation === 'toast'
          ? ['[--z-index:41]']
          : ['[--z-index:1]'];
  }
};
