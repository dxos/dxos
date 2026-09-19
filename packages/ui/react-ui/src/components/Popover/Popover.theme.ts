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
 * The arrow box straddles the content's edge and `positioning.css` shifts it outward by
 * `--arrow-inset`, the focus ring's width, so the box is centred on the ring's outer edge. The
 * content draws no border, only its ring, so the tip's stroke (see `Popover.Arrow`) is transparent
 * until the content is focus-visible and then the ring's colour, at the ring's width. The shift is
 * constant, so taking focus never moves the arrow.
 */
const arrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--surface-bg)] [--arrow-inset:var(--dx-focus-line)]',
    '[&>svg]:overflow-visible [&>svg]:size-full [&>svg]:fill-(--arrow-background)',
    '[&>svg]:stroke-transparent [&>svg]:stroke-(length:--dx-focus-line) [:focus-visible>&>svg]:stroke-(--color-focus-ring-subtle)',
    ...etc,
  );

export const popoverTheme: Theme<PopoverStyleProps> = {
  positioner,
  content,
  viewport,
  arrow,
};
