//
// Copyright 2022 DXOS.org
//

import { mx, surfaceShadow, surfaceZIndex, surfaceZIndexVar } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type PopoverStyleProps = Partial<{
  constrainBlock: boolean;
  constrainInline: boolean;
  elevation: Elevation;
}>;

/**
 * The floating element. The machine positions it with an inline `z-index: var(--z-index)`, which
 * outranks any `z-*` class, so the layer is handed over through the variable.
 */
const positioner: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(surfaceZIndexVar({ elevation, level: 'menu' }), ...etc);

const content: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'dx-popover-surface border-2 border-separator rounded-sm',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    'dx-focus-ring',
    ...etc,
  );

const viewport: ComponentFunction<PopoverStyleProps> = ({ constrainBlock, constrainInline }, ...etc) =>
  mx(
    // Always clipped: with the content no longer clipping (see above), the viewport is what keeps a
    // square-cornered child inside the surface's rounded corners.
    'grid grid-rows-[1fr] min-w-popover-min-width overflow-hidden',
    // `--available-*` are set by the machine on the positioner, so they reach here by inheritance.
    constrainBlock && 'max-h-[min(var(--available-height),calc(100dvh-var(--spacing-screen-border)*2))]',
    constrainInline && 'max-w-(--available-width)',
    ...etc,
  );

/**
 * A rotated square painted from `--arrow-background` in the content's border colour, sunk beneath
 * the content so only the half outside its edge shows — a triangle, not a diamond.
 */
const arrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx('z-[-1] [--arrow-size:12px] [--arrow-background:var(--color-separator)]', ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  positioner,
  content,
  viewport,
  arrow,
};
