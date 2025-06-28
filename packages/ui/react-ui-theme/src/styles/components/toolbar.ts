//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type ToolbarStyleProps = Partial<{ layoutManaged: boolean }>;

export const toolbarLayout =
  'bs-full is-full flex flex-nowrap shrink-0 items-center gap-1 p-2 overflow-x-auto scrollbar-none contain-layout';

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = ({ layoutManaged }, ...etc) => {
  return mx('bg-toolbarSurface dx-toolbar', !layoutManaged && toolbarLayout, ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
