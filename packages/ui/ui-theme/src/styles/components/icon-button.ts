//
// Copyright 2022 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { mx } from '../../util';

import { type ButtonStyleProps } from './button';

export type IconButtonStyleProps = ButtonStyleProps & { iconOnly?: boolean };

// TODO(burdon): Gap/font size should depend on density.
export const iconButtonRoot: ComponentFunction<IconButtonStyleProps> = ({ iconOnly }, ...etc) => {
  return mx('gap-2', iconOnly && 'p-iconButtonPadding min-bs-0', ...etc);
};

export const iconButtonTheme: Theme<IconButtonStyleProps> = {
  root: iconButtonRoot,
};
