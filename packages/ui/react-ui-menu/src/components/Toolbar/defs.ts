//
// Copyright 2025 DXOS.org
//

import { type ToolbarRootProps } from '@dxos/react-ui';

import {
  type MenuContextValue,
  type MenuItemGroup,
  type MenuActionProperties,
  type MenuActionGroupMultipleSelect,
  type MenuActionGroupSingleSelect,
} from '../../defs';

export type ToolbarActionGroupDropdownMenu = Omit<MenuActionProperties, 'variant' | 'icon'> & {
  variant: 'dropdownMenu';
  icon: string;
  applyActiveIcon?: boolean;
};

export type ToolbarActionGroupToggleGroup = Omit<MenuActionProperties, 'variant'> & {
  variant: 'toggleGroup';
};

export type ToolbarActionGroupProperties = (ToolbarActionGroupDropdownMenu | ToolbarActionGroupToggleGroup) &
  (MenuActionGroupSingleSelect | MenuActionGroupMultipleSelect);

export type ToolbarProps = Partial<MenuContextValue> & ToolbarRootProps;

export type ToolbarActionGroupProps = {
  group: MenuItemGroup;
};
