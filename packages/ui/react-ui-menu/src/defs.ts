//
// Copyright 2025 DXOS.org
//
import { type Node, type Action, type ActionGroup, ACTION_GROUP_TYPE } from '@dxos/app-graph';
import { type ToolbarSeparatorProps, type Label, type IconButtonProps } from '@dxos/react-ui';

export type MenuActionProperties = {
  label: Label;
  icon: string;
  value?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  testId?: string;
  variant?: 'action' | 'toggle';
  checked?: boolean;
};

export type MenuAction = Action<MenuActionProperties>;

export type MenuActionHandler<A extends Node = MenuAction> = (action: A) => void;

export const MenuSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type MenuSeparator = Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof MenuSeparatorType;
};

export const isSeparator = (node: Node): node is MenuSeparator => node.type === MenuSeparatorType;

export type MenuActionGroupSingleSelect = { selectCardinality: 'single'; value: string };
export type MenuActionGroupMultipleSelect = { selectCardinality: 'multiple'; value: string[] };

export type MenuItemGroup<P extends Record<string, any> = Record<string, any>> = ActionGroup<P>;

export const isMenuGroup = (node: Node): node is MenuItemGroup => node.type === ACTION_GROUP_TYPE;

export type MenuItem = MenuSeparator | MenuAction | MenuItemGroup;

export type MenuItemsResolver = (group?: MenuItemGroup) => MenuItem[] | null;

export type MenuContextValue<A extends Node = MenuAction> = {
  resolveGroupItems: MenuItemsResolver;
  iconSize: IconButtonProps['size'];
  onAction: MenuActionHandler<A>;
};
