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

const spotlight: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(layer, 'rounded-sm ring-2 ring-accent-bg', ...etc);

// A dialog step has no anchor: the positioner covers the viewport and centres the card.
const positioner: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(
    layer,
    'data-[type=dialog]:fixed data-[type=dialog]:inset-0 data-[type=dialog]:grid data-[type=dialog]:place-items-center',
    ...etc,
  );

const content: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(
    'dx-popover-surface flex flex-col gap-2 w-72 p-3 border-2 border-separator rounded-sm dx-focus-ring',
    surfaceShadow({ elevation: 'positioned' }),
    ...etc,
  );

// As `Popover.Arrow`: the tip straddles the border, and `positioning.css` shifts it outward by the border width.
const arrow: ComponentFunction<TourStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--surface-bg)] [--arrow-inset:2px]',
    '[&>[data-part=arrow-tip]]:border-separator [&>[data-part=arrow-tip]]:border-t-2 [&>[data-part=arrow-tip]]:border-l-2',
    ...etc,
  );

const title: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx('text-lg font-medium', ...etc);

const description: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx('text-description', ...etc);

const progressText: ComponentFunction<TourStyleProps> = (_props, ...etc) => mx('text-xs text-description', ...etc);

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
