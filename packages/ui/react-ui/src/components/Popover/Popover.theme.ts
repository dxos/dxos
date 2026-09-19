//
// Copyright 2022 DXOS.org
//

import { mx, positionerUnplaced, surfaceShadow, surfaceZIndex, surfaceZIndexVar } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Surface, type Theme } from '@dxos/ui-types';

export type PopoverStyleProps = Partial<{
  constrainBlock: boolean;
  constrainInline: boolean;
  elevation: Elevation;
  /** An explicit level, from `Content elevation`; the popover then paints it instead of `popup`. */
  surface: Surface;
}>;

/**
 * The floating element. The machine positions it with an inline `z-index: var(--z-index)`, which
 * outranks any `z-*` class, so the layer is handed over through the variable.
 */
const positioner: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(positionerUnplaced, surfaceZIndexVar({ elevation, level: 'menu' }), ...etc);

const content: ComponentFunction<PopoverStyleProps> = ({ elevation, surface }, ...etc) =>
  mx(
    !surface && 'dx-popover-surface',
    'dx-focus-ring rounded-sm min-h-[1rem]',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
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
 * outward. The content draws no border, only its focus ring, so the tip follows the ring: its two
 * outer edges are ring-width borders, transparent until the content is focus-visible and then the
 * ring's colour, and it is shifted outward by the ring's width (`--arrow-inset`, applied by
 * `positioning.css`) so those edges meet the ring's outer edge. The shift is constant, so taking
 * focus never moves the arrow; the content's backdrop filter makes it the arrow's containing block.
 */
const arrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--surface-bg)] [--arrow-inset:var(--dx-focus-line)]',
    '[&>[data-part=arrow-tip]]:border-transparent [&>[data-part=arrow-tip]]:border-t-[length:var(--dx-focus-line)] [&>[data-part=arrow-tip]]:border-l-[length:var(--dx-focus-line)]',
    '[:focus-visible>&>[data-part=arrow-tip]]:border-(--color-focus-ring-subtle)',
    ...etc,
  );

export const popoverTheme: Theme<PopoverStyleProps> = {
  positioner,
  content,
  viewport,
  arrow,
};
