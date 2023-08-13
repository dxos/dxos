//
// Copyright 2022 DXOS.org
//

import { ComponentFunction } from '@dxos/aurora-types';
import type { Theme } from '@dxos/aurora-types';

import { mx } from '../../util';

export type ToolbarStyleProps = Partial<{}>;

// TODO(burdon): Surface?
export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = (props, ...etc) => {
  return mx('space-x-2', ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
