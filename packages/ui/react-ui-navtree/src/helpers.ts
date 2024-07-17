//
// Copyright 2024 DXOS.org
//

import { type Action, type ActionGroup, isAction, type Node, type NodeFilter, type Graph } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { nonNullable } from '@dxos/util';

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
export const treeNodeFromGraphNode = (
  graph: Graph,
  node: Node,
  options: TreeNodeFromGraphNodeOptions = {},
): TreeNode => {
  const { filter, path = [] } = options;

  const treeNode = create<TreeNode>({
    id: node.id,
    type: node.type,
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
      const parent = graph.nodes(node, { relation: 'inbound' }).find((n) => n.id === parentId);
      return parent ? treeNodeFromGraphNode(graph, parent, { ...options, path: path.slice(0, -1) }) : null;
    },
    get children() {
      return graph
        .nodes(node, { filter, onlyLoaded: true })
        .map((n) => {
          // Break cycles.
          const nextPath = [...path, node.id];
          return nextPath.includes(n.id) ? undefined : treeNodeFromGraphNode(graph, n, { ...options, path: nextPath });
        })
        .filter(nonNullable);
    },
    get actions() {
      return graph
        .actions(node, { onlyLoaded: true })
        .map((action) =>
          isAction(action)
            ? treeActionFromGraphAction(graph, action)
            : treeActionGroupFromGraphActionGroup(graph, action),
        );
    },
    loadChildren: () => {
      graph.nodes(node, { filter });
    },
    loadActions: () => {
      graph.actions(node);
    },
  });

  return treeNode;
};

/**
 * Get a reactive tree action from a graph action.
 */
export const treeActionFromGraphAction = (graph: Graph, action: Action): TreeNodeAction => {
  const { icon, label, keyBinding, ...properties } = action.properties;
  const node = graph.nodes(action, { relation: 'inbound' })[0];
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
export const treeActionGroupFromGraphActionGroup = (graph: Graph, actionGroup: ActionGroup): TreeNodeActionGroup => {
  const { icon, label, ...properties } = actionGroup.properties;
  const treeActionGroup = create<TreeNodeActionGroup>({
    id: actionGroup.id,
    label,
    icon,
    properties,
    get actions() {
      // TODO(wittjosiah): Support nested action groups.
      return graph
        .actions(actionGroup, { onlyLoaded: true })
        .flatMap((action) => (isAction(action) ? treeActionFromGraphAction(graph, action) : []));
    },
    loadActions: () => {
      graph.actions(actionGroup);
    },
  });

  return treeActionGroup;
};
