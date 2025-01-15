//
// Copyright 2025 DXOS.org
//

import { type Node, type ActionGroup, type Graph, ACTION_GROUP_TYPE } from '@dxos/app-graph';
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

export type ToolbarProps = ToolbarRootProps &
  MenuProps<ToolbarItem, MenuAction> & { iconSize?: IconButtonProps['size']; graph?: Graph };

export type ToolbarActionGroupProps = Pick<ToolbarProps, 'iconSize'> &
  Omit<MenuProps<MenuAction>, 'actions'> & {
    actionGroup: ToolbarActionGroup;
    // TODO(thure): use callback for getting children instead of graph.
    graph?: Graph;
    applyActiveIcon?: boolean;
  };
