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
const root: ComponentFunction<IconButtonStyleProps> = ({ iconOnly, square }, ...etc) => {
  return mx(!iconOnly && 'gap-1.5', (square || iconOnly) && 'aspect-square', ...etc);
};

export const iconButtonTheme: Theme<IconButtonStyleProps> = {
  root,
};
