//
// Copyright 2023 DXOS.org
//

import { type Action, type Node, type NodeFilter, type Graph, ACTION_TYPE, ACTION_GROUP_TYPE } from '@dxos/app-graph';
import { Path } from '@dxos/react-ui-mosaic';
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
      onCopy: (activeNode: NavTreeItemGraphNode) => MaybePromise<void>;
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
  const parentId = path[path.length - 2];
  return graph.nodes(node, { relation: 'inbound' }).find((n) => n.id === parentId) as NavTreeItemGraphNode | undefined;
};

export const getPersistenceParent = (
  graph: Graph,
  node: NavTreeItemGraphNode,
  path: string[],
  persistenceClass: string,
): NavTreeItemGraphNode | null => {
  if (node.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return node;
  } else {
    const parent = getParent(graph, node, path);
    return parent ? getPersistenceParent(graph, parent, path.slice(0, path.length - 1), persistenceClass) : null;
  }
};

export const resolveMigrationOperation = (
  graph: Graph,
  activeNode: NavTreeItemGraphNode,
  destinationPath: string[],
  destinationRelatedNode?: NavTreeItemGraphNode,
): 'transfer' | 'copy' | 'reject' => {
  const activeClass = activeNode.properties.persistenceClass;
  if (destinationRelatedNode && activeClass) {
    const persistenceParent = getPersistenceParent(graph, destinationRelatedNode, destinationPath, activeClass);
    if (persistenceParent) {
      const activeKey = activeNode.properties.persistenceKey;
      if (activeKey && persistenceParent?.properties.acceptPersistenceKey) {
        return persistenceParent.properties.acceptPersistenceKey.has(activeKey) &&
          destinationRelatedNode.properties.onTransferStart
          ? 'transfer'
          : destinationRelatedNode.properties.onCopy
            ? 'copy'
            : 'reject';
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
    .nodes(node, { relation: 'outbound', filter })
    .map((n) => {
      // Break cycles.
      const nextPath = [...path, node.id];
      return nextPath.includes(n.id) ? undefined : (n as NavTreeItemGraphNode);
    })
    .filter(nonNullable) as NavTreeItemGraphNode[];
};

export const getActions = (graph: Graph, node: NavTreeItemGraphNode) => {
  return graph.actions(node) as unknown as (NavTreeActionNode | NavTreeActionsNode)[];
};

export const expandChildrenAndActions = async (graph: Graph, node: NavTreeItemGraphNode) => {
  await Promise.all([
    graph.expand(node, 'outbound'),
    graph.expand(node, 'outbound', ACTION_TYPE),
    graph.expand(node, 'outbound', ACTION_GROUP_TYPE),
  ]);
  // Look ahead in order to load the children & actions necessary for the NavTree to function properly.
  return Promise.all(
    getChildren(graph, node).map((child) => [
      graph.expand(child, 'outbound'),
      graph.expand(child, 'outbound', ACTION_TYPE),
      graph.expand(child, 'outbound', ACTION_GROUP_TYPE),
    ]),
  );
};

function* navTreeItemVisitor(
  graph: Graph,
  node: NavTreeItemGraphNode,
  openItemIds: Set<string>,
  path: string[] = [],
  filter?: NodeFilter,
): Generator<NavTreeItem> {
  const l0Children = getChildren(graph, node, filter, path);
  const l0Actions = getActions(graph, node);

  const stack: NavTreeItem[] = [
    {
      id: Path.create(node.id),
      node,
      path: [node.id],
      parentOf: (l0Children ?? []).map(({ id }) => id),
      actions: l0Actions,
    },
  ];

  while (stack.length > 0) {
    const nextItem = stack.pop()!;
    if ((nextItem.path?.length ?? 0) > 1) {
      yield nextItem;
    }
    const { id, node, path } = nextItem;
    const children = getChildren(graph, node, filter, path);
    if ((path?.length ?? 0) === 1 || openItemIds.has(id ?? 'never')) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i] as NavTreeItemGraphNode;
        const childPath = path ? [...path, child.id] : [child.id];
        const childChildren = getChildren(graph, child, filter, childPath);
        const childActions = getActions(graph, child);
        stack.push({
          id: Path.create(...childPath),
          node: child,
          path: childPath,
          ...((childChildren?.length ?? 0) > 0 && {
            parentOf: childChildren!.map(({ id }) => Path.create(...childPath, id)),
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
  openItemIds: Set<string>,
  path: string[] = [],
  filter?: NodeFilter,
): NavTreeItem[] => {
  return Array.from(navTreeItemVisitor(graph, rootNode, openItemIds, path, filter));
};

export const expandOpenGraphNodes = (graph: Graph, openItemIds: Set<string>) => {
  return Promise.all(
    Array.from(openItemIds)
      .map((openItemId) => {
        // TODO(thure): This dubious `.replace` approach is to try getting L1 nodes identified only by an id that contains Path’s SEPARATOR character, e.g. 'dxos.org/plugin/space-spaces'
        const node = graph.findNode(Path.last(openItemId)) ?? graph.findNode(openItemId.replace(/^root\//, ''));
        return node && expandChildrenAndActions(graph, node as NavTreeItemGraphNode);
      })
      .filter(nonNullable),
  );
};
