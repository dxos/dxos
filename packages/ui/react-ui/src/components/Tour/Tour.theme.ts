//
// Copyright 2026 DXOS.org
//

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type TourStyleProps = {};

/**
 * The machine stacks its parts on `--tour-layer` (backdrop 0, spotlight 1, card 2) over
 * `--tour-z-index`, which every part declares here; the card's own z-index is the inline
 * `var(--z-index)` the machine computes from the two. The tooltip level, over menus and popovers.
 */
const layer = '[--tour-z-index:50] z-[calc(var(--tour-layer)+var(--tour-z-index))]';

const backdrop: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx(layer, 'bg-scrim-surface', ...etc);

// The box is the target's own rect (`useTour` zeroes the machine's offset), so an inset ring paints over
// the target's border rather than around it.
const spotlight: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(layer, 'rounded-sm ring-2 ring-inset ring-accent-bg', ...etc);

// A dialog step has no anchor: the positioner covers the viewport and centres the card.
const positioner: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(
    layer,
    'data-[type=dialog]:fixed data-[type=dialog]:inset-0 data-[type=dialog]:grid data-[type=dialog]:place-items-center',
    ...etc,
  );

// The card is a tinted zone, so the controls on it (a ghost button's hover) derive from the tint.
const content: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(
    // Positioned so it is the arrow's containing block, as the popover's backdrop filter makes its
    // content: the arrow then lands one border inside the edge and `positioning.css` shifts it out
    // by `--arrow-inset` to straddle it. Unpositioned, the arrow measures against the positioner and
    // that shift opens a gap.
    'relative flex flex-col gap-2 w-72 p-3 rounded-sm border-2 dx-primary-surface border-primary-border text-primary-fg dx-focus-ring',
    surfaceShadow({ elevation: 'positioned' }),
    ...etc,
  );

// As `Popover.Arrow`: the tip straddles the border, and `positioning.css` shifts it outward by the border width.
const arrow: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--color-primary-surface)] [--arrow-inset:1px]',
    '[&>[data-part=arrow-tip]]:border-primary-border [&>[data-part=arrow-tip]]:border-t-2 [&>[data-part=arrow-tip]]:border-l-2',
    ...etc,
  );

const title: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx('text-lg font-medium', ...etc);

const description: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx(...etc);

const progressText: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx('text-xs opacity-70', ...etc);

const control: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx('flex items-center justify-between gap-2', ...etc);

export const tourTheme: Theme<TourStyleProps> = {
  backdrop,
  spotlight,
  positioner,
  content,
  arrow,
  title,
  description,
  progressText,
  control,
};
