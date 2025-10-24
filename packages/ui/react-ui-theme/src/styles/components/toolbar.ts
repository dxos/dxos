//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { textBlockWidth } from '../fragments';

export type ToolbarStyleProps = Partial<{ layoutManaged: boolean }>;

// TODO(burdon): Fix overflow issue for CM editor popovers.
export const toolbarLayout =
  'is-full shrink-0 flex flex-nowrap items-center gap-1 p-1 overflow-x-auto scrollbar-none contain-layout';

// TODO(burdon): Should depend on data attribute?
export const toolbarInactive = '*:opacity-20 !bg-transparent';

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = ({ layoutManaged }, ...etc) => {
  return mx('bg-toolbarSurface dx-toolbar', !layoutManaged && toolbarLayout, ...etc);
};

export const toolbarInner: ComponentFunction<ToolbarStyleProps> = ({ layoutManaged }, ...etc) => {
  return mx(!layoutManaged && ['flex gap-1', textBlockWidth], ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
  inner: toolbarInner,
};
