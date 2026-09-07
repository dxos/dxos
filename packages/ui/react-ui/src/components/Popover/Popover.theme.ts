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
 * Zag's arrow is a square straddling the content's edge, rotated so its top-left corner points
 * outward. Painted in the surface colour with the border on those two edges, its inner half covers
 * the content's border and the outline appears to bend around the tip. The content's backdrop
 * filter makes it the arrow's containing block, whose padding box starts inside the border, so
 * `positioning.css` moves the arrow outward by `--arrow-inset`, the border width, to meet the
 * border's outer edge.
 */
const arrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--surface-bg)] [--arrow-inset:2px]',
    '[&>[data-part=arrow-tip]]:border-separator [&>[data-part=arrow-tip]]:border-t-2 [&>[data-part=arrow-tip]]:border-l-2',
    ...etc,
  );

export const popoverTheme: Theme<PopoverStyleProps> = {
  positioner,
  content,
  viewport,
  arrow,
};
