//
// Copyright 2025 DXOS.org
//

import { ACTION_GROUP_TYPE, type Action, type ActionGroup, type Node } from '@dxos/app-graph';
import { type IconButtonProps, type ToolbarSeparatorProps } from '@dxos/react-ui';
import { type MenuActionProperties } from '@dxos/ui-types';

export type MenuAction<P extends {} = {}> = Action<P & MenuActionProperties>;

export const MenuSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type MenuSeparator = Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof MenuSeparatorType;
};

export const isSeparator = (node: Node): node is MenuSeparator => node.type === MenuSeparatorType;

export type MenuSingleSelectActionGroup = { selectCardinality: 'single'; value: string };
export type MenuMultipleSelectActionGroup = { selectCardinality: 'multiple'; value: string[] };

export type MenuItemGroup<P extends Record<string, any> = Record<string, any>> = ActionGroup<P>;

export const isMenuGroup = (node: Node): node is MenuItemGroup => node.type === ACTION_GROUP_TYPE;

export type MenuItem = MenuSeparator | MenuAction | MenuItemGroup;

export type MenuItemsResolver = (group?: MenuItemGroup) => MenuItem[] | null;

export type MenuContextValue = {
  useGroupItems: MenuItemsResolver;
  iconSize: IconButtonProps['size'];
  attendableId?: string;
};
