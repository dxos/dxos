//
// Copyright 2022 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/react-ui-types';

import { type ButtonStyleProps } from './button';
import { mx } from '../../util';

export const iconButtonRoot: ComponentFunction<ButtonStyleProps> = (_props, ...etc) => {
  return mx('ch-icon-button ch-focus-ring gap-2 text-sm', ...etc);
};

export const iconButtonTheme: Theme<ButtonStyleProps> = {
  root: iconButtonRoot,
};
