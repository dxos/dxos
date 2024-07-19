//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import { type FC } from 'react';

import { type InvokeParams, type Action, type ActionGroup, type Node } from '@dxos/app-graph';
import { type Label } from '@dxos/react-ui';
import { type MakeOptional, type MaybePromise } from '@dxos/util';

// TODO(thure): Dedupe (similar in react-ui-deck)
export type TreeNodeAction = Pick<Action, 'id' | 'properties'> & {
  label: Label;
  icon?: FC<IconProps>;
  keyBinding?: string | KeyBinding;
  invoke: (params?: Omit<InvokeParams, 'node'>) => MaybePromise<any>;
};

export type TreeNodeActionGroup = Pick<ActionGroup, 'id' | 'properties'> & {
  label: Label;
  icon?: FC<IconProps>;
  // TODO(wittjosiah): Support nested groups.
  actions: TreeNodeAction[];
  loadActions: () => void;
};

export type TreeNodeActionLike = TreeNodeAction | TreeNodeActionGroup;

export type TreeNode = MakeOptional<Node, 'data'> & {
  label: Label;
  icon?: FC<IconProps>;
  parent: TreeNode | null;
  children: TreeNode[];
  actions: TreeNodeActionLike[];
  loadChildren: () => void;
  loadActions: () => void;
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
