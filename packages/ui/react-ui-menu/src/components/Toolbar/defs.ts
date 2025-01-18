//
// Copyright 2025 DXOS.org
//

import { type Node, type ActionGroup, ACTION_GROUP_TYPE } from '@dxos/app-graph';
import { type ToolbarRootProps, type ToolbarSeparatorProps, type IconButtonProps } from '@dxos/react-ui';

import { type MenuAction, type MenuActionProperties, type MenuProps } from '../../defs';

export const MenuSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type MenuSeparator = Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof MenuSeparatorType;
};

export const isSeparator = (node: Node): node is MenuSeparator => node.type === MenuSeparatorType;

export type ToolbarActionGroupDropdownMenu = Omit<MenuActionProperties, 'variant' | 'icon'> & {
  variant: 'dropdownMenu';
  icon: string;
  applyActiveIcon?: boolean;
};

export type ToolbarActionGroupToggleGroup = Omit<MenuActionProperties, 'variant'> & {
  variant: 'toggleGroup';
};

export type MenuActionGroupSingleSelect = { selectCardinality: 'single'; value: string };
export type MenuActionGroupMultipleSelect = { selectCardinality: 'multiple'; value: string[] };

export type ToolbarActionGroupProperties = (ToolbarActionGroupDropdownMenu | ToolbarActionGroupToggleGroup) &
  (MenuActionGroupSingleSelect | MenuActionGroupMultipleSelect);

export type MenuItemGroup = ActionGroup<ToolbarActionGroupProperties>;

export const isMenuGroup = (node: Node): node is MenuItemGroup => node.type === ACTION_GROUP_TYPE;

export type MenuItem = MenuSeparator | MenuAction | MenuItemGroup;

export type MenuItemsResolver = (group?: MenuItemGroup) => MenuItem[] | null;

export type MenuContextValue = Pick<MenuProps<MenuItem, MenuAction>, 'onAction'> & {
  resolveGroupItems: MenuItemsResolver;
  iconSize: IconButtonProps['size'];
};

export type ToolbarProps = Partial<MenuContextValue> & ToolbarRootProps & MenuProps<MenuItem, MenuAction>;

export type ToolbarActionGroupProps = Pick<ToolbarProps, 'iconSize'> &
  Omit<MenuProps<MenuAction>, 'items'> & {
    group: MenuItemGroup;
  };
