//
// Copyright 2023 DXOS.org
//

import { dataDisabled } from '@dxos/ui-theme';
import { mx, surfaceShadow, surfaceZIndex } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type MenuStyleProps = Partial<{
  constrainBlockSize: boolean;
  elevation: Elevation;
}>;

const content: ComponentFunction<MenuStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'dx-popover-surface w-48 rounded-md md:w-56 border border-separator',
    surfaceZIndex({ elevation, level: 'menu' }),
    surfaceShadow({ elevation: 'positioned' }),
    ...etc,
  );

const viewport: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('rounded-sm p-1 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto', ...etc);

const item: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-2 text-sm',
    'hover:bg-hover-surface data-[highlighted]:bg-hover-surface',
    'dx-focus-subdued',
    dataDisabled,
    ...etc,
  );

const separator: ComponentFunction<MenuStyleProps> = (_props, ...etc) => mx('my-1 mx-2 h-px bg-separator', ...etc);

const groupLabel: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('text-description', 'select-none px-2 py-2', ...etc);

const arrow: ComponentFunction<MenuStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const menuTheme: Theme<MenuStyleProps> = {
  content,
  viewport,
  item,
  separator,
  groupLabel,
  arrow,
};
