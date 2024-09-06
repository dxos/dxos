//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { dataDisabled, descriptionText, popperMotion, subduedFocus, surfaceElevation } from '../fragments';

export type MenuStyleProps = Partial<{
  constrainBlockSize: boolean;
}>;

export const menuViewport: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('rounded-md p-1 max-bs-[--radix-dropdown-menu-content-available-height] overflow-y-auto', ...etc);

export const menuContent: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    'is-48 rounded-md md:is-56 z-[30] bg-bg-deck border border-separator',
    popperMotion,
    surfaceElevation({ elevation: 'group' }),
    ...etc,
  );

export const menuItem: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm',
    'data-[highlighted]:bg-bg-hover',
    subduedFocus,
    dataDisabled,
    ...etc,
  );

export const menuSeparator: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('mlb-1 mli-2 bs-px bg-neutral-75 dark:bg-neutral-700', ...etc);

export const menuGroupLabel: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(descriptionText, 'select-none pli-2 plb-2', ...etc);

export const menuArrow: ComponentFunction<MenuStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const menuTheme: Theme<MenuStyleProps> = {
  content: menuContent,
  viewport: menuViewport,
  item: menuItem,
  separator: menuSeparator,
  groupLabel: menuGroupLabel,
  arrow: menuArrow,
};
