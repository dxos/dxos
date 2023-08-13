//
// Copyright 2022 DXOS.org
//

import { ComponentFunction } from '@dxos/aurora-types';
import type { Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { chromeSurface } from '../fragments';

export type ToolbarStyleProps = Partial<{}>;

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = (props, ...etc) => {
  return mx('space-x-2', chromeSurface, ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
