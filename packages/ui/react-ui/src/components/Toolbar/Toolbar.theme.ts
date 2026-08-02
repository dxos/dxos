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

// The bar declares its density so the shared rule (theme/spacing.css) resizes both the bar and
// every control inside it; the height then follows the same knob rather than a hard-coded step.
const root: ComponentFunction<ToolbarStyleProps> = ({ density, disabled, layoutManaged }, ...etc) => {
  return mx(
    'dx-toolbar-surface shadow-sm',
    density && `dx-density-${density}`,
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
