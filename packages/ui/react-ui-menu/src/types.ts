//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { type IconButtonProps, type ToolbarSeparatorProps } from '@dxos/react-ui';
import { type MenuActionProperties } from '@dxos/ui-types';

export type MenuAction<P extends {} = {}> = AppGraphNode.Action<P & MenuActionProperties>;

export const MenuSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type MenuSeparator = AppGraphNode.Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof MenuSeparatorType;
};

export const isSeparator = (node: AppGraphNode.Node): node is MenuSeparator => node.type === MenuSeparatorType;

export type MenuItemGroup<P extends Record<string, any> = Record<string, any>> = AppGraphNode.ActionGroup<P>;

export const isMenuGroup = (node: AppGraphNode.Node): node is MenuItemGroup =>
  node.type === AppGraphNode.ActionGroupType;

/** Graph-sourced menu nodes carry plugin-specific properties validated at runtime. */
export type GraphMenuItem = AppGraphNode.Action | AppGraphNode.ActionGroup;

export type MenuItem = MenuSeparator | MenuAction | MenuItemGroup | GraphMenuItem;

/** Group context for graph-backed dropdown menus (any graph node, not only action groups). */
export type MenuGroupContext = MenuItemGroup | AppGraphNode.Node;

/** Atom-family-style accessor: returns an atom of items for a given group (or root when undefined). */
export type MenuItemsAccessor = (group?: MenuGroupContext) => Atom.Atom<MenuItem[] | null>;

export type ActionExecutor = (action: MenuAction, params: AppGraphNode.InvokeProps) => void;

export type MenuItemsMode = 'additive' | 'replacement';

export type AddMenuItemsProps = {
  id: string;
  mode: MenuItemsMode;
  priority?: number;
  items: MenuItem[];
  groupFilter?: (group?: MenuGroupContext) => boolean;
};

export type MenuItems = Omit<AddMenuItemsProps, 'priority'> & { priority: number };
export type MenuItemsMap = Map<string, MenuItems>;

export type MenuContextValue = {
  /** Atom-family accessor for base menu items, keyed by group (similar to Tree model). */
  items: MenuItemsAccessor;
  iconSize: IconButtonProps['size'];
  attendableId?: string;
  /** TODO(burdon): Remove and assume always active if attendableId is undefined. */
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
