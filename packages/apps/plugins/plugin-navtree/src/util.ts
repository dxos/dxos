//
// Copyright 2023 DXOS.org
//

import { type Action, type Node, type NodeFilter, type Graph } from '@dxos/app-graph';
import { Treegrid } from '@dxos/react-ui';
import {
  type NavTreeActionNode,
  type NavTreeActionsNode,
  type NavTreeItemNode,
  type NavTreeItemNodeProperties,
} from '@dxos/react-ui-navtree';
import { type MaybePromise, nonNullable } from '@dxos/util';

export type NavTreeItemGraphNode = Node<
  any,
  NavTreeItemNodeProperties &
    Partial<{
      persistenceClass: string;
      persistenceKey: string;
      acceptPersistenceClass: Set<string>;
      acceptPersistenceKey: Set<string>;
      onRearrangeChildren: (nextOrder: NavTreeItemGraphNode[]) => MaybePromise<void>;
      onTransferStart: (activeNode: NavTreeItemGraphNode) => MaybePromise<void>;
      onTransferEnd: (activeNode: NavTreeItemGraphNode, destinationParent: NavTreeItemGraphNode) => MaybePromise<void>;
    }>
>;
export type NavTreeItem = NavTreeItemNode<NavTreeItemGraphNode>;

export const getParent = (
  graph: Graph,
  node: NavTreeItemGraphNode,
  path: string[],
): NavTreeItemGraphNode | undefined => {
  const parentId = path[path.length - 1];
  return graph.nodes(node, { relation: 'inbound' }).find((n) => n.id === parentId) as NavTreeItemGraphNode | undefined;
};

export const getPersistenceParent = (
  graph: Graph,
  node: NavTreeItemGraphNode,
  path: string[],
  persistenceClass: string,
): NavTreeItemGraphNode | null => {
  const parent = getParent(graph, node, path);
  if (!node || !parent) {
    return null;
  }

  if (parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return parent;
  } else {
    return getPersistenceParent(graph, parent, path.slice(0, path.length - 1), persistenceClass);
  }
};

export const resolveMigrationOperation = (
  graph: Graph,
  activeNode: NavTreeItemGraphNode,
  destinationPath: string[],
  destinationRelatedNode?: NavTreeItemGraphNode,
): 'transfer' | 'copy' | 'reject' => {
  const activeClass = activeNode.properties.persistenceClass;
  if (destinationRelatedNode && destinationRelatedNode.properties.onTransferStart && activeClass) {
    const persistenceParent = getPersistenceParent(graph, destinationRelatedNode, destinationPath, activeClass);
    if (persistenceParent) {
      const activeKey = activeNode.properties.persistenceKey;
      if (activeKey && persistenceParent?.properties.acceptPersistenceKey) {
        return persistenceParent.properties.acceptPersistenceKey.has(activeKey) ? 'transfer' : 'copy';
      } else {
        return 'reject';
      }
    } else {
      return 'reject';
    }
  } else {
    return 'reject';
  }
};

// TODO(wittjosiah): Move into node implementation?
export const sortActions = (actions: Action[]): Action[] =>
  actions.sort((a, b) => {
    if (a.properties.disposition === b.properties.disposition) {
      return 0;
    }

    if (a.properties.disposition === 'toolbar') {
      return -1;
    }

    return 1;
  });

export const getTreeItemNode = (treeItems: NavTreeItemNode[], path?: string[]): NavTreeItemNode | undefined => {
  if (!path) {
    return undefined;
  }

  return treeItems.find((treeItem) => {
    return treeItem.path && !treeItem.path.find((id, index) => path[index] !== id);
  });
};

export const getChildren = (
  graph: Graph,
  node: NavTreeItemGraphNode,
  filter?: NodeFilter,
  path: string[] = [],
): NavTreeItemGraphNode[] => {
  return graph
    .nodes(node, { filter, onlyLoaded: true })
    .map((n) => {
      // Break cycles.
      const nextPath = [...path, node.id];
      return nextPath.includes(n.id) ? undefined : (n as NavTreeItemGraphNode);
    })
    .filter(nonNullable);
};

export const getActions = (graph: Graph, node: NavTreeItemGraphNode) => {
  return graph.actions(node, {
    onlyLoaded: true,
  }) as unknown as (NavTreeActionNode | NavTreeActionsNode)[];
};

function* visitor(
  graph: Graph,
  node: NavTreeItemGraphNode,
  openItemPaths: Set<string>,
  path: string[] = [],
  filter?: NodeFilter,
): Generator<NavTreeItem> {
  const l0Children = getChildren(graph, node, filter, path);
  const l0Actions = getActions(graph, node);

  const stack: NavTreeItem[] = [
    {
      id: node.id,
      node,
      path: [node.id],
      parentOf: (l0Children ?? []).map(({ id }) => id),
      actions: l0Actions,
    },
  ];

  while (stack.length > 0) {
    const { node, path, parentOf, actions } = stack.pop()!;
    if ((path?.length ?? 0) > 1) {
      yield { id: node.id, node, path, parentOf, actions };
    }

    const children = getChildren(graph, node, filter, path);
    if ((path?.length ?? 0) === 1 || openItemPaths.has(path?.join(Treegrid.PATH_SEPARATOR) ?? 'never')) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i] as NavTreeItemGraphNode;
        const childPath = path ? [...path, child.id] : [child.id];
        const childChildren = getChildren(graph, child, filter, childPath);
        const childActions = getActions(graph, child);
        stack.push({
          id: child.id,
          node: child,
          path: childPath,
          ...((childChildren?.length ?? 0) > 0 && {
            parentOf: childChildren!.map(({ id }) => id),
          }),
          actions: childActions,
        });
      }
    }
  }
}

/**
 * Get a reactive tree node from a graph node.
 */
export const treeItemsFromRootNode = (
  graph: Graph,
  rootNode: NavTreeItemGraphNode,
  openItemPaths: Set<string>,
  path: string[] = [],
  filter?: NodeFilter,
): NavTreeItem[] => {
  return Array.from(visitor(graph, rootNode, openItemPaths, path, filter));
};
