//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type ToolbarStyleProps = Partial<{}>;

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = (_props, ...etc) => {
  return mx('flex shrink-0 items-center gap-2 p-1 is-full overflow-x-auto overflow-y-hidden contain-layout', ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
