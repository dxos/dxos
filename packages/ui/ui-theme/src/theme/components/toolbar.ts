//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { textBlockWidth } from '../fragments';

export type ToolbarStyleProps = Partial<{
  density: Density;
  disabled: boolean;
  layoutManaged: boolean;
}>;

export const toolbarLayout =
  'w-full shrink-0 flex flex-nowrap p-1 gap-1 items-center overflow-x-auto scrollbar-none contain-layout';

export const toolbarRoot: ComponentFunction<ToolbarStyleProps> = ({ density, disabled, layoutManaged }, ...etc) => {
  return mx(
    'bg-toolbar-surface dx-toolbar',
    density === 'coarse' && 'h-(--dx-rail-size) px-3!',
    disabled && '*:opacity-20',
    !layoutManaged && toolbarLayout,
    ...etc,
  );
};

export const toolbarInner: ComponentFunction<ToolbarStyleProps> = ({ layoutManaged }, ...etc) => {
  return mx(!layoutManaged && ['flex gap-1', textBlockWidth], ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root: toolbarRoot,
  inner: toolbarInner,
};
