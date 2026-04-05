//
// Copyright 2022 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { mx } from '../../util';

import { type ButtonStyleProps } from './button';

export type IconButtonStyleProps = ButtonStyleProps & { iconOnly?: boolean };

export const iconButtonRoot: ComponentFunction<IconButtonStyleProps> = ({ iconOnly }, ...etc) => {
  return mx('px-1.5', !iconOnly && 'gap-2', ...etc);
};

export const iconButtonTheme: Theme<IconButtonStyleProps> = {
  root: iconButtonRoot,
};
