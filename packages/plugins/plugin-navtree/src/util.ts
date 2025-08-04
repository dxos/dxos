//
// Copyright 2023 DXOS.org
//

import { type Action, type Node, type ReadableGraph, isAction, isActionLike } from '@dxos/app-graph';
import { isNonNullable } from '@dxos/util';

import { type FlattenedActions, type NavTreeItemGraphNode } from './types';

export const getParent = (
  graph: ReadableGraph,
  node: NavTreeItemGraphNode,
  path: string[],
): NavTreeItemGraphNode | undefined => {
  const parentId = path[path.length - 2];
  return graph.getConnections(node.id, 'inbound').find((n) => n.id === parentId) as NavTreeItemGraphNode | undefined;
};

export const getPersistenceParent = (
  graph: ReadableGraph,
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
  graph: ReadableGraph,
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
          persistenceParent.properties.onTransferStart
          ? 'transfer'
          : persistenceParent.properties.onCopy
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

    if (a.properties.disposition === 'list-item-primary') {
      return -1;
    }

    return 1;
  });

export const getChildren = (
  graph: ReadableGraph,
  node: NavTreeItemGraphNode,
  path: readonly string[] = [],
): NavTreeItemGraphNode[] => {
  return graph
    .getConnections(node.id, 'outbound')
    .map((n) => {
      // Break cycles.
      const nextPath = [...path, node.id];
      return nextPath.includes(n.id) ? undefined : (n as NavTreeItemGraphNode);
    })
    .filter(isNonNullable) as NavTreeItemGraphNode[];
};

export const l0ItemType = (item: Node<any>) => {
  if (item.properties.disposition === 'collection') {
    return 'collection';
  } else if (isActionLike(item)) {
    return 'action';
  } else if (item.properties.disposition === 'navigation') {
    return 'link';
  } else {
    return 'tab';
  }
};
