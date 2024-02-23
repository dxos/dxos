//
// Copyright 2024 DXOS.org
//

import { deepSignal, type RevertDeepSignal } from 'deepsignal/react';

import { type Action, type ActionGroup, isAction, type Node, type NodeFilter } from '@dxos/app-graph';

import { type TreeNodeAction, type TreeNode, type TreeNodeActionLike, type TreeNodeActionGroup } from './types';

export type TreeNodeFromGraphNodeOptions = {
  filter?: NodeFilter;
  path?: string[];
};

export const treeNodeFromGraphNode = (node: Node, options: TreeNodeFromGraphNodeOptions = {}): TreeNode => {
  const { icon, label, ...properties } = node.properties;
  const { filter, path = [] } = options;

  const treeNode = deepSignal<TreeNode>({
    id: node.id,
    label,
    icon,
    properties,
    get children() {
      return node.nodes({ filter }).map((n) => treeNodeFromGraphNode(n, { ...options, path: [...path, node.id] }));
    },
    get actions() {
      return node
        .actions()
        .map((action) =>
          isAction(action) ? treeActionFromGraphAction(action) : treeActionGroupFromGraphActionGroup(action),
        );
    },
  });

  return treeNode as RevertDeepSignal<TreeNode>;
};

export const treeActionFromGraphAction = (action: Action): TreeNodeAction => {
  const { icon, label, ...properties } = action.properties;
  const treeAction = deepSignal<TreeNodeActionLike>({
    id: action.id,
    label,
    icon,
    properties,
    invoke: action.data,
  });

  return treeAction as RevertDeepSignal<TreeNodeAction>;
};

export const treeActionGroupFromGraphActionGroup = (actionGroup: ActionGroup): TreeNodeActionGroup => {
  const { icon, label, ...properties } = actionGroup.properties;
  const treeActionGroup = deepSignal<TreeNodeActionGroup>({
    id: actionGroup.id,
    label,
    icon,
    properties,
    get actions() {
      // TODO(wittjosiah): Support nested action groups.
      return actionGroup.actions().flatMap((action) => (isAction(action) ? treeActionFromGraphAction(action) : []));
    },
  });

  return treeActionGroup as RevertDeepSignal<TreeNodeActionGroup>;
};
