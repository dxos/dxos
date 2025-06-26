//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type ToolbarStyleProps = Partial<{ layoutManaged: boolean }>;

export const toolbarLayout = 'flex flex-nowrap shrink-0 items-center gap-1 p-1 overflow-x-auto contain-layout';

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = ({ layoutManaged }, ...etc) => {
  return mx('is-full bg-toolbarSurface dx-toolbar', !layoutManaged && toolbarLayout, ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
