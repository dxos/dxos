//
// Copyright 2023 DXOS.org
//

import { type Label } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

type NavTreeItemNodeSharedProperties = {
  label: Label;
  iconSymbol?: string;
  disabled?: boolean;
  testId?: string;
};

export type NavTreeItemNodeProperties = NavTreeItemNodeSharedProperties & {
  role?: string;
  isPreview?: boolean;
  error?: string;
  modified?: boolean;
  palette?: string;
};

export type NavTreeItemActionProperties = NavTreeItemNodeSharedProperties & {
  disposition?: string;
  hidden?: boolean;
  caller?: string;
  menuType?: 'searchList' | 'dropdown';
};

// TODO(thure): Dedupe (similar in react-ui-deck)
export type NavTreeItemAction = NavTreeItemNodeProperties & {
  id: string;
  invoke: (params?: Record<string, any>) => MaybePromise<any>;
  keyBinding?: string | KeyBinding;
  properties?: NavTreeItemActionProperties;
};

export type NavTreeItemActionGroup = NavTreeItemNodeProperties & {
  id: string;
  // TODO(wittjosiah): Support nested groups.
  actions: NavTreeItemAction[];
  properties?: NavTreeItemActionProperties;
};

export type NavTreeItemNode = {
  id: string;
  properties?: NavTreeItemNodeProperties;
}; // satisfies Node from @dxos/app-graph

export type NavTreeItem = {
  id: NavTreeItemNode['id'];
  node: NavTreeItemNode;
  actions?: (NavTreeItemAction | NavTreeItemActionGroup)[];
  path?: string[];
  parentOf?: string[];
};

/**
 * Platform-specific key binding.
 */
// NOTE: Keys come from `getHostPlatform` in `@dxos/util`.
// TODO(thure): Dedupe (similar in react-ui-deck)
export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};
