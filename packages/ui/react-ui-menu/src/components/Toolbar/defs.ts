//
// Copyright 2025 DXOS.org
//

import { type Node, type ActionGroup, ACTION_GROUP_TYPE } from '@dxos/app-graph';
import { type ToolbarRootProps, type ToolbarSeparatorProps, type IconButtonProps } from '@dxos/react-ui';

import { type MenuAction, type MenuActionProperties, type MenuProps } from '../../defs';

export const ToolbarSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type ToolbarSeparatorNode = Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof ToolbarSeparatorType;
};

export const isSeparator = (node: Node): node is ToolbarSeparatorNode => node.type === ToolbarSeparatorType;

export type ToolbarActionGroupDropdownMenu = Omit<MenuActionProperties, 'variant' | 'icon'> & {
  variant: 'dropdownMenu';
  icon: string;
  applyActiveIcon?: boolean;
};

export type ToolbarActionGroupToggleGroup = Omit<MenuActionProperties, 'variant'> & {
  variant: 'toggleGroup';
};

export type ToolbarActionGroupSingleSelect = { selectCardinality: 'single'; value: string };
export type ToolbarActionGroupMultipleSelect = { selectCardinality: 'multiple'; value: string[] };

export type ToolbarActionGroupProperties = (ToolbarActionGroupDropdownMenu | ToolbarActionGroupToggleGroup) &
  (ToolbarActionGroupSingleSelect | ToolbarActionGroupMultipleSelect);

export type ToolbarActionGroup = ActionGroup<ToolbarActionGroupProperties>;

export const isMenu = (node: Node): node is ToolbarActionGroup => node.type === ACTION_GROUP_TYPE;

export type ToolbarItem = ToolbarSeparatorNode | MenuAction | ToolbarActionGroup;

export type ToolbarGroupItemsResolver = (group: ToolbarActionGroup) => Promise<ToolbarItem[] | null>;

export type ToolbarContextValue = Pick<MenuProps<ToolbarItem, MenuAction>, 'onAction'> & {
  resolveGroupItems: ToolbarGroupItemsResolver;
  iconSize: IconButtonProps['size'];
};

export type ToolbarProps = Partial<ToolbarContextValue> & ToolbarRootProps & MenuProps<ToolbarItem, MenuAction>;

export type ToolbarActionGroupProps = Pick<ToolbarProps, 'iconSize'> &
  Omit<MenuProps<MenuAction>, 'actions'> & {
    actionGroup: ToolbarActionGroup;
  };
