//
// Copyright 2022 DXOS.org
//

import { ComponentFunction } from '@dxos/aurora-types';
import type { Theme } from '@dxos/aurora-types';

import { mx } from '../../util';

export type ToolbarStyleProps = Partial<{}>;

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = (_props, ...etc) => {
  return mx('flex items-center gap-2 is-full', ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
