//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment } from '@dxos/react-ui-types';

import { ghostHover } from './hover';

export const ghostSelectedCurrent =
  ghostHover +
  ' aria-[current]:surface-input hover:aria-[current]:surface-hover' +
  ' aria-selected:bg-primary-100 dark:aria-selected:bg-primary-850 hover:aria-selected:bg-primary-150 hover:dark:aria-selected:bg-primary-800' +
  ' aria-[current]:aria-selected:bg-primary-200 dark:aria-[current]:aria-selected:bg-primary-750 hover:aria-[current]:aria-selected:bg-primary-200 hover:dark:aria-[current]:aria-selected:bg-primary-750';

export const ghostHighlighted =
  'data-[highlighted]:bg-primary-100 dark:data-[highlighted]:bg-primary-850 hover:data-[highlighted]:bg-primary-150 hover:dark:data-[highlighted]:bg-primary-800';

export const ghostSelectedTrackingInterFromNormal = 'tracking-[0.0092em]';

export const ghostSelected =
  'aria-selected:surface-base aria-selected:fg-accent hover:aria-selected:fg-accentHover aria-selected:font-semibold aria-selected:tracking-normal transition-[color,font-variation-settings,letter-spacing]';

export type SelectedStyleProps = {
  current?: boolean;
  selected?: boolean;
};

export const staticGhostSelectedCurrent: ComponentFragment<SelectedStyleProps> = ({ current, selected }) => [
  current && selected
    ? 'bg-primary-200 dark:bg-primary-750 hover:bg-primary-200 hover:dark:bg-primary-750'
    : current
      ? 'surface-input hover:surface-hover'
      : selected
        ? 'bg-primary-100 dark:bg-primary-850 hover:bg-primary-150 hover:dark:bg-primary-800'
        : ghostHover,
];

export const staticGhostSelected: ComponentFragment<Pick<SelectedStyleProps, 'selected'>> = ({ selected }) =>
  selected ? ['bg-primary-200 dark:bg-primary-750'] : [];
