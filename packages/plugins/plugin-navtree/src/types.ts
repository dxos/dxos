//
// Copyright 2023 DXOS.org
//

import { type Action, type ActionLike, type Node } from '@dxos/app-graph';
import { type Label } from '@dxos/react-ui';
import { type ItemType } from '@dxos/react-ui-list';

export type NavTreeItem = ItemType & {
  node: Node;
  actions: ActionLike[];
  groupedActions: Record<string, Action[]>;
};

type SharedProperties = {
  label: Label;
  icon?: string;
  disabled?: boolean;
  testId?: string;
};

export type NodeProperties = SharedProperties & {
  role?: string;
  error?: string;
  modified?: boolean;
  palette?: string;
};

export type ActionProperties = SharedProperties & {
  disposition?: string;
  hidden?: boolean;
  caller?: string;
  menuType?: 'searchList' | 'dropdown';
  keyBinding?: string | KeyBinding;
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
