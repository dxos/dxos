//
// Copyright 2024 DXOS.org
//

import { type Action, type ActionGroup, isAction, type Node, type NodeFilter } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';

import { type TreeNodeAction, type TreeNode, type TreeNodeActionGroup } from './types';

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
  const { filter, path = [] } = options;

  const treeNode = create<TreeNode>({
    id: node.id,
    data: node.data,
    get label() {
      return node.properties.label;
    },
    get icon() {
      return node.properties.icon;
    },
    get properties() {
      // This must be done inside the getter so that properties are only reactive if they are accessed.
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { label, icon, ...properties } = node.properties;
      return properties;
    },
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

  return treeNode;
};

/**
 * Get a reactive tree action from a graph action.
 */
export const treeActionFromGraphAction = (action: Action): TreeNodeAction => {
  const { icon, label, keyBinding, ...properties } = action.properties;
  const node = action.nodes({ direction: 'inbound' })[0];
  const treeAction = create<TreeNodeAction>({
    id: action.id,
    label,
    icon,
    keyBinding,
    properties,
    invoke: (params) => action.data({ node, ...params }),
  });

  return treeAction;
};

/**
 * Get a reactive tree action group from a graph action group.
 */
export const treeActionGroupFromGraphActionGroup = (actionGroup: ActionGroup): TreeNodeActionGroup => {
  const { icon, label, ...properties } = actionGroup.properties;
  const treeActionGroup = create<TreeNodeActionGroup>({
    id: actionGroup.id,
    label,
    icon,
    properties,
    get actions() {
      // TODO(wittjosiah): Support nested action groups.
      return actionGroup.actions().flatMap((action) => (isAction(action) ? treeActionFromGraphAction(action) : []));
    },
  });

  return treeActionGroup;
};
