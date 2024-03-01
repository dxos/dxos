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

export const getTreeNode = (tree: TreeNode, path?: string[]): TreeNode => {
  if (!path) {
    return tree;
  }

  let node = tree;
  path.slice(1).forEach((part) => {
    const children = node.children;
    const i = children.findIndex((child) => child.id === part);
    if (i === -1) {
      return [];
    }
    node = children[i];
  });

  return node;
};

/**
 * Get a reactive tree node from a graph node.
 */
export const treeNodeFromGraphNode = (node: Node, options: TreeNodeFromGraphNodeOptions = {}): TreeNode => {
  const { icon, label, ...properties } = node.properties;
  const { filter, path = [] } = options;

  const treeNode = deepSignal<TreeNode>({
    id: node.id,
    label,
    icon,
    properties,
    data: node.data,
    get parent() {
      const parentId = path[path.length - 1];
      const parent = node.nodes({ direction: 'inbound' }).find((n) => n.id === parentId);
      return parent ? treeNodeFromGraphNode(parent, { ...options, path: path.slice(0, -1) }) : null;
    },
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

/**
 * Get a reactive tree action from a graph action.
 */
export const treeActionFromGraphAction = (action: Action): TreeNodeAction => {
  const { icon, label, keyBinding, ...properties } = action.properties;
  const node = action.nodes({ direction: 'inbound' })[0];
  const treeAction = deepSignal<TreeNodeActionLike>({
    id: action.id,
    label,
    icon,
    keyBinding,
    properties,
    invoke: (params) => action.data({ node, ...params }),
  });

  return treeAction as RevertDeepSignal<TreeNodeAction>;
};

/**
 * Get a reactive tree action group from a graph action group.
 */
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
