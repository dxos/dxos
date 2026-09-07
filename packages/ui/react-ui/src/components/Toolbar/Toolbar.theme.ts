//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

const layout = 'w-full shrink-0 flex flex-nowrap items-center overflow-x-auto scrollbar-none dx-contain-layout';

export type ToolbarStyleProps = Partial<{
  density: Density;
  disabled: boolean;
  layoutManaged: boolean;
}>;

// The bar declares its density so the shared rule (theme/spacing.css) resizes both the bar and
// every control inside it; the height then follows the same knob rather than a hard-coded step.
const root: ComponentFunction<ToolbarStyleProps> = ({ density, disabled, layoutManaged }, ...etc) => {
  return mx(
    // No shadow here: `Panel.Toolbar` casts the bar's edge shadow, and a toolbar reaches that slot
    // two ways — as a descendant, or merged into it via `asChild`. Only the descendant form can be
    // detected in CSS, so a shadow on this element would double up in the merged form and read as a
    // floating bar. The slot owns it in both.
    'dx-toolbar-surface',
    // As a descendant of a Panel slot the slot has already painted the surface full-width; painting
    // again clamps it to this element, which a `classNames='dx-document'` toolbar renders as a strip
    // floating inside the bar. (Merged via `asChild` there is one element, which must keep it.)
    '[[data-slot=toolbar]_&]:bg-transparent',
    '[[data-slot=statusbar]_&]:bg-transparent',
    !layoutManaged && [layout, density === 'sm' ? 'p-0.5 gap-0.5' : 'p-1 gap-1'],
    density && `dx-density-${density}`,
    disabled && '*:opacity-20',
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
