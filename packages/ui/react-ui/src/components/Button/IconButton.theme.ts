//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { type ButtonStyleProps } from './Button.theme';

export type IconButtonStyleProps = ButtonStyleProps & {
  iconOnly?: boolean;
  square?: boolean;
};

// No padding utility here: `utilities` is the last cascade layer, so a `px-*` would override the
// density-driven `padding-inline` on `.dx-button` at every density.
//
// An icon-only button is always square. `aspect-square` pins the inline size, which stops it
// stretching to a wider grid cell — so it is paired with `justify-self-center`, otherwise it
// silently left-aligns (that is what pushed the R0 rail's sidebar toggle 4px off-centre).
const root: ComponentFunction<IconButtonStyleProps> = ({ iconOnly, square }, ...etc) => {
  return mx(!iconOnly && 'gap-1.5', (square || iconOnly) && 'aspect-square justify-self-center', ...etc);
};

export const iconButtonTheme: Theme<IconButtonStyleProps> = {
  root,
};
