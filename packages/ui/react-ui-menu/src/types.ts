//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Node } from '@dxos/app-graph';
import { type IconButtonProps, type ToolbarSeparatorProps } from '@dxos/react-ui';
import { type MenuActionProperties } from '@dxos/ui-types';

export type MenuAction<P extends {} = {}> = Node.Action<P & MenuActionProperties>;

export const MenuSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type MenuSeparator = Node.Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof MenuSeparatorType;
};

export const isSeparator = (node: Node.Node): node is MenuSeparator => node.type === MenuSeparatorType;

export type MenuSingleSelectActionGroup = { selectCardinality: 'single'; value: string };
export type MenuMultipleSelectActionGroup = { selectCardinality: 'multiple'; value: string[] };

export type MenuItemGroup<P extends Record<string, any> = Record<string, any>> = Node.ActionGroup<P>;

export const isMenuGroup = (node: Node.Node): node is MenuItemGroup => node.type === Node.ActionGroupType;

export type MenuItem = MenuSeparator | MenuAction | MenuItemGroup;

export type MenuItemsResolver = (group?: MenuItemGroup) => MenuItem[] | null;

export type ActionExecutor = (action: MenuAction, params: Node.InvokeProps) => void;

export type MenuItemsMode = 'additive' | 'replacement';

export type AddMenuItemsProps = {
  id: string;
  mode: MenuItemsMode;
  priority?: number;
  items: MenuItem[];
  groupFilter?: (group?: MenuItemGroup) => boolean;
};

export type MenuItems = Omit<AddMenuItemsProps, 'priority'> & { priority: number };
export type MenuItemsMap = Map<string, MenuItems>;

export type MenuContextValue = {
  // TODO(wittjosiah): Migrate this to be an atom. Similar to how Tree works.
  useGroupItems: MenuItemsResolver;
  iconSize: IconButtonProps['size'];
  attendableId?: string;
  /** If true, the menu is always active regardless of attention state. */
  alwaysActive?: boolean;
  /** Atom holding the current set of imperatively added menu items. */
  menuItemsAtom: Atom.Atom<MenuItemsMap>;
  /** Imperatively add menu items to the nearest MenuProvider. */
  addMenuItems: (props: AddMenuItemsProps) => void;
  /** Remove previously added menu items by id. */
  removeMenuItems: (id: string) => void;
  /** Optional action executor. If provided, will be used instead of default execution. */
  onAction?: ActionExecutor;
};
