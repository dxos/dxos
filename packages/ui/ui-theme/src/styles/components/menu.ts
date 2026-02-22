//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { dataDisabled, descriptionText, modalSurface, subduedFocus, surfaceShadow, surfaceZIndex } from '../fragments';

export type MenuStyleProps = Partial<{
  constrainBlockSize: boolean;
  elevation: Elevation;
}>;

export const menuViewport: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('rounded-sm p-1 max-block-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto', ...etc);

export const menuContent: ComponentFunction<MenuStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-48 rounded-sm md:inline-56 border border-separator',
    surfaceZIndex({ elevation, level: 'menu' }),
    surfaceShadow({ elevation: 'positioned' }),
    modalSurface,
    // popperMotion,
    ...etc,
  );

export const menuItem: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-2 text-sm',
    'data-[highlighted]:bg-hoverSurface',
    subduedFocus,
    dataDisabled,
    ...etc,
  );

export const menuSeparator: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('my-1 mx-2 bs-px bg-separator', ...etc);

export const menuGroupLabel: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(descriptionText, 'select-none px-2 py-2', ...etc);

export const menuArrow: ComponentFunction<MenuStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const menuTheme: Theme<MenuStyleProps> = {
  content: menuContent,
  viewport: menuViewport,
  item: menuItem,
  separator: menuSeparator,
  groupLabel: menuGroupLabel,
  arrow: menuArrow,
};
