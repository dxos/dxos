//
// Copyright 2023 DXOS.org
//

import { type Label } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

export type OpenItemIds = Record<string, true>;

type NavTreeNodeSharedProperties = {
  label: Label;
  iconSymbol?: string;
  disabled?: boolean;
  testId?: string;
};

export type NavTreeItemNodeProperties = NavTreeNodeSharedProperties & {
  role?: string;
  isPreview?: boolean;
  error?: string;
  modified?: boolean;
  palette?: string;
};

export type NavTreeActionProperties = NavTreeNodeSharedProperties & {
  disposition?: string;
  hidden?: boolean;
  caller?: string;
  menuType?: 'searchList' | 'dropdown';
  keyBinding?: string | KeyBinding;
};

// TODO(thure): Dedupe (similar in react-ui-deck)
export type NavTreeActionNode = {
  id: string;
  data?: (params?: Record<string, any>) => MaybePromise<any>;
  properties?: NavTreeActionProperties;
};

export type NavTreeActionsNode = {
  id: string;
  // TODO(wittjosiah): Support nested groups.
  actions: NavTreeActionNode[];
  properties?: NavTreeActionProperties;
};

export type NavTreeNode = {
  id: string;
  data: any;
  properties?: NavTreeItemNodeProperties;
}; // satisfies Node from @dxos/app-graph

export type NavTreeItemActions = (NavTreeActionNode | NavTreeActionsNode)[];

export type NavTreeItemPosition = number;

export type NavTreeItemMoveDetails = { levelOffset: number };

/**
 * The NavTreeNode wrapped with other properties needed to render a NavTree item.
 */
export type NavTreeItemNode<N extends NavTreeNode = NavTreeNode> = {
  id: NavTreeNode['id'];
  node: N;
  actions?: NavTreeItemActions;
  groupedActions?: Record<NavTreeActionsNode['id'], NavTreeActionNode[]>;
  path?: string[];
  parentOf?: string[];
};

/**
 * Platform-specific key binding.
 */
export type KeyBinding = {
  // NOTE: Keys come from `getHostPlatform` in `@dxos/util`.
  // TODO(thure): Dedupe (similar in react-ui-deck)
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};
