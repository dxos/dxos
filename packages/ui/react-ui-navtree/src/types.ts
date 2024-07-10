//
// Copyright 2023 DXOS.org
//

import { type Label } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

export type NavTreeItemNodeProperties = {
  label: Label;
  iconSymbol?: string;
  role?: string;
  disabled?: boolean;
  isPreview?: boolean;
  testId?: string;
  error?: string;
  modified?: boolean;
  palette?: string;
};

export type NavTreeItemActionProperties = {
  disposition?: string;
  hidden?: boolean;
  testId?: string;
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
