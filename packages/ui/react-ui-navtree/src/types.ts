//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import { type FC } from 'react';

import { type InvokeParams, type Action, type ActionGroup, type NodeBase } from '@dxos/app-graph';
import { type MakeOptional, type MaybePromise } from '@dxos/util';

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
};

export type TreeNodeActionLike = TreeNodeAction | TreeNodeActionGroup;

export type TreeNode = MakeOptional<NodeBase, 'data'> & {
  label: Label;
  icon?: FC<IconProps>;
  parent: TreeNode | null;
  children: TreeNode[];
  actions: TreeNodeActionLike[];
};

// TODO(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures.
export type Label = string | [string, { ns: string; count?: number }];

/**
 * Platform-specific key binding.
 */
// NOTE: Keys come from `getHostPlatform` in `@dxos/util`.
export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};
