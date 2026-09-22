//
// Copyright 2022 DXOS.org
//

import { mx, positionerUnplaced, surfaceShadow, surfaceZIndex, surfaceZIndexVar } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Surface, type Theme } from '@dxos/ui-types';

export type PopoverStyleProps = Partial<{
  /** Outline the content with the separator; the arrow's stroke follows it. */
  border: boolean;
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

const content: ComponentFunction<PopoverStyleProps> = ({ border, elevation, surface }, ...etc) =>
  mx(
    !surface && 'dx-popover-surface',
    // The arrow reads the outline it has to continue from these, so they travel with the border.
    border && 'border border-separator [--popover-stroke:var(--color-separator)] [--popover-stroke-width:1px]',
    'dx-focus-ring min-h-[1rem] rounded-sm',
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
 * `--arrow-inset`, the width of whatever outline the content draws, so the box is centred on that
 * outline's outer edge. The tip (see `Popover.Arrow`) strokes that edge at twice the width and is
 * clipped to the arrow's outer shape, so exactly one width shows inside it whatever the width is.
 * The outline is the content's border when it has one (`--popover-stroke`), nothing otherwise, and
 * the focus ring while the content is focus-visible.
 */
const arrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--surface-bg)]',
    '[--arrow-inset:var(--popover-stroke-width,0px)] [:focus-visible>&]:[--arrow-inset:var(--dx-focus-line)]',
    '[&>svg]:overflow-visible [&>svg]:size-full [&>svg]:fill-(--arrow-background)',
    '[&>svg]:stroke-(--popover-stroke,transparent) [&>svg]:stroke-[length:calc(var(--popover-stroke-width,0px)*2)]',
    '[:focus-visible>&>svg]:stroke-(--color-focus-ring-subtle) [:focus-visible>&>svg]:stroke-[length:calc(var(--dx-focus-line)*2)]',
    ...etc,
  );

export const popoverTheme: Theme<PopoverStyleProps> = {
  positioner,
  content,
  viewport,
  arrow,
};
