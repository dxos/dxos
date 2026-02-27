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

export type MenuContextValue = {
  useGroupItems: MenuItemsResolver;
  iconSize: IconButtonProps['size'];
  attendableId?: string;
  /** Optional action executor. If provided, will be used instead of default execution. */
  onAction?: ActionExecutor;
};

//
// Menu Contribution types.
//

/** Mode for how a contribution is applied. */
export type MenuContributionMode = 'additive' | 'replacement';

/** Input for useMenuContribution hook - accepts either static items or an atom. */
export type MenuContributionInput = {
  /** Unique identifier for deterministic ordering. */
  id: string;
  /** How the contribution is applied. 'additive' appends, 'replacement' overwrites. */
  mode: MenuContributionMode;
  /** Priority for ordering (lower = first). Default: 100. */
  priority?: number;
  /** Items to contribute - can be static array or reactive atom. */
  items: MenuItem[] | Atom.Atom<MenuItem[]>;
  /** Optional filter to scope contribution to specific groups. */
  groupFilter?: (group?: MenuItemGroup) => boolean;
};

/** Internal representation of a contribution with normalized atom. */
export type MenuContribution = {
  id: string;
  mode: MenuContributionMode;
  priority: number;
  items: Atom.Atom<MenuItem[]>;
  groupFilter?: (group?: MenuItemGroup) => boolean;
};
