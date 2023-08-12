//
// Copyright 2022 DXOS.org
//

import { ComponentFunction } from '@dxos/aurora-types';
import type { Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { chromeSurface } from '../fragments';

export type SelectStyleProps = Partial<{}>;

export const selectContent: ComponentFunction<SelectStyleProps> = (props, ...etc) => {
  return mx('font-medium text-sm p-2 z-[50]', chromeSurface, ...etc);
};

export const selectTheme: Theme<SelectStyleProps> = {
  content: selectContent,
};
