//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment } from '@dxos/react-ui-types';

import { ghostHover } from './hover';

export const ghostSelectedCurrent =
  ghostHover +
  ' aria-[current]:bg-neutral-100 dark:aria-[current]:bg-neutral-800 hover:aria-[current]:bg-neutral-100 hover:dark:aria-[current]:bg-neutral-800' +
  ' aria-selected:bg-primary-100 dark:aria-selected:bg-primary-850 hover:aria-selected:bg-primary-150 hover:dark:aria-selected:bg-primary-800' +
  ' aria-[current]:aria-selected:bg-primary-200 dark:aria-[current]:aria-selected:bg-primary-750 hover:aria-[current]:aria-selected:bg-primary-200 hover:dark:aria-[current]:aria-selected:bg-primary-750';

export const ghostHighlighted =
  'data-[highlighted]:bg-primary-100 dark:data-[highlighted]:bg-primary-850 hover:data-[highlighted]:bg-primary-150 hover:dark:data-[highlighted]:bg-primary-800';

// TODO(burdon): Doesn't work well in dark mode.
export const ghostSelected = 'aria-selected:bg-primary-100 dark:aria-selected:bg-primary-850';

export type SelectedStyleProps = {
  current?: boolean;
  selected?: boolean;
};

export const staticGhostSelectedCurrent: ComponentFragment<SelectedStyleProps> = ({ current, selected }) => [
  current && selected
    ? 'bg-primary-200 dark:bg-primary-750 hover:bg-primary-200 hover:dark:bg-primary-750'
    : current
    ? 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-100 hover:dark:bg-neutral-800'
    : selected
    ? 'bg-primary-100 dark:bg-primary-850 hover:bg-primary-150 hover:dark:bg-primary-800'
    : ghostHover,
];

export const staticGhostSelected: ComponentFragment<Pick<SelectedStyleProps, 'selected'>> = ({ selected }) =>
  selected ? ['bg-primary-200 dark:bg-primary-750'] : [];
