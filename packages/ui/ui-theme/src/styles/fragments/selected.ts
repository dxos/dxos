//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment } from '@dxos/ui-types';

import { ghostHover } from './hover';

// TODO(burdon): Use semantic tokens (e.g., accentSurfaceHover, bg-gridSelectionOverlay)?

export const ghostSelectedCurrent = [
  ghostHover,
  'aria-[current]:bg-inputSurface hover:aria-[current]:bg-hoverSurface',
  'aria-selected:bg-primary-100 dark:aria-selected:bg-primary-850 hover:aria-selected:bg-primary-150 hover:dark:aria-selected:bg-primary-800',
  'aria-[current]:aria-selected:bg-primary-200 dark:aria-[current]:aria-selected:bg-primary-750 hover:aria-[current]:aria-selected:bg-primary-200 hover:dark:aria-[current]:aria-selected:bg-primary-750',
];

export const ghostHighlighted =
  'data-[highlighted]:bg-primary-100 dark:data-[highlighted]:bg-primary-600 hover:data-[highlighted]:bg-primary-150 hover:dark:data-[highlighted]:bg-primary-500';

export const ghostSelectedTrackingInterFromNormal = 'tracking-[0.0092em]';

export const ghostSelected =
  'aria-selected:bg-baseSurface aria-selected:text-accentText hover:aria-selected:text-accentTextHover aria-selected:font-semibold aria-selected:tracking-normal transition-[color,font-variation-settings,letter-spacing]';

export const ghostSelectedContainerMd =
  '@md:aria-selected:bg-baseSurface @md:aria-selected:text-accentText @md:hover:aria-selected:text-accentTextHover @md:aria-selected:font-semibold @md:aria-selected:tracking-normal @md:transition-[color,font-variation-settings,letter-spacing]';

export type SelectedStyleProps = {
  current?: boolean;
  selected?: boolean;
};

export const staticGhostSelectedCurrent: ComponentFragment<SelectedStyleProps> = ({ current, selected }) => [
  current && selected
    ? 'bg-primary-200 dark:bg-primary-750 hover:bg-primary-200 hover:dark:bg-primary-750'
    : current
      ? 'bg-inputSurface hover:bg-hoverSurface'
      : selected
        ? 'bg-primary-100 dark:bg-primary-850 hover:bg-primary-150 hover:dark:bg-primary-800'
        : ghostHover,
];

export const staticGhostSelected: ComponentFragment<Pick<SelectedStyleProps, 'selected'>> = ({ selected }) =>
  selected ? ['bg-primary-200 dark:bg-primary-750'] : [];
