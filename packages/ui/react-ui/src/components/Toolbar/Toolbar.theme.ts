//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

export type ToolbarStyleProps = Partial<{
  density: Density;
  disabled: boolean;
  layoutManaged: boolean;
}>;

const layout =
  'w-full shrink-0 flex flex-nowrap p-1 gap-1 items-center overflow-x-auto scrollbar-none dx-contain-layout';

const root: ComponentFunction<ToolbarStyleProps> = ({ density, disabled, layoutManaged }, ...etc) => {
  return mx(
    'bg-toolbar-surface dx-toolbar shadow-sm',
    density === 'lg' && 'h-(--dx-rail-size) px-3!',
    density === 'sm' && 'h-7 px-2!',
    density === 'xs' && 'h-6 px-1!',
    disabled && '*:opacity-20',
    !layoutManaged && layout,
    ...etc,
  );
};

const text: ComponentFunction<ToolbarStyleProps> = (_, ...etc) => {
  return mx('px-2 truncate items-center', ...etc);
};

export const toolbarTheme: Theme<ToolbarStyleProps> = {
  root,
  text,
};
