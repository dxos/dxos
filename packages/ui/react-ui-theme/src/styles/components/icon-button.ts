//
// Copyright 2022 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/react-ui-types';

import { type ButtonStyleProps } from './button';
import { mx } from '../../util';

// TODO(burdon): Gap/font size should depend on density.
export const iconButtonRoot: ComponentFunction<ButtonStyleProps> = (_props, ...etc) => {
  return mx('ch-icon-button dx-focus-ring gap-2', ...etc);
};

export const iconButtonTheme: Theme<ButtonStyleProps> = {
  root: iconButtonRoot,
};
