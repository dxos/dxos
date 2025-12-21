//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment, type Elevation, type SurfaceLevel } from '@dxos/ui-types';

/**
 * @deprecated
 */
export const contentShadow: ComponentFragment<{ elevation?: Elevation }> = (_) => ['shadow-none'];

// TODO(thure): These should become tokens.
export const surfaceShadow: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'positioned' ? 'shadow' : elevation === 'dialog' || elevation === 'toast' ? 'shadow-md' : 'shadow-none',
];

export const surfaceZIndex: ComponentFragment<{ level?: SurfaceLevel; elevation?: Elevation }> = ({
  level,
  elevation,
}) => {
  switch (level) {
    case 'tooltip':
      return elevation === 'dialog' ? ['z-[53]'] : elevation === 'toast' ? ['z-[43]'] : ['z-30'];
    case 'menu':
      return elevation === 'dialog' ? ['z-[52]'] : elevation === 'toast' ? ['z-[42]'] : ['z-20'];
    default:
      return elevation === 'dialog' ? ['z-[51]'] : elevation === 'toast' ? ['z-[41]'] : ['z-[1]'];
  }
};
