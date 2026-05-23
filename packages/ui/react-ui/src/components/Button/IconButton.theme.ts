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

const root: ComponentFunction<IconButtonStyleProps> = ({ iconOnly, square }, ...etc) => {
  return mx('px-1.5', !iconOnly && 'gap-1.5', square && 'aspect-square', ...etc);
};

export const iconButtonTheme: Theme<IconButtonStyleProps> = {
  root,
};
