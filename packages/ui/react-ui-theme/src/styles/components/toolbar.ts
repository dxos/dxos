//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type ToolbarStyleProps = Partial<{ layoutManaged: boolean }>;

// TODO(burdon): Fix overflow issue for CM editor popovers.
export const toolbarLayout =
  'is-full shrink-0 flex flex-nowrap items-center gap-1 p-1.5 __overflow-x-auto scrollbar-none contain-layout';

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = ({ layoutManaged }, ...etc) => {
  return mx('bg-toolbarSurface dx-toolbar', !layoutManaged && toolbarLayout, ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
};
