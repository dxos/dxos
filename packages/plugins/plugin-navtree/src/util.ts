//
// Copyright 2023 DXOS.org
//

import { Graph, Node } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

import { type NavTreeItemGraphNode } from '#types';

export const getParent = (
  graph: Graph.ReadableGraph,
  node: NavTreeItemGraphNode,
  path: string[],
): NavTreeItemGraphNode | undefined => {
  const parentId = path[path.length - 2];
  return Graph.getConnections(graph, node.id, Node.childRelation('inbound')).find(
    (n: Node.Node) => n.id === parentId,
  ) as NavTreeItemGraphNode | undefined;
};

export const getPersistenceParent = (
  graph: Graph.ReadableGraph,
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
  graph: Graph.ReadableGraph,
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
export const sortActions = (actions: Node.Action[]): Node.Action[] =>
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
  graph: Graph.ReadableGraph,
  node: NavTreeItemGraphNode,
  path: readonly string[] = [],
): NavTreeItemGraphNode[] => {
  return Graph.getConnections(graph, node.id, 'child')
    .map((n: Node.Node) => {
      // Break cycles.
      const nextPath = [...path, node.id];
      return nextPath.includes(n.id) ? undefined : (n as NavTreeItemGraphNode);
    })
    .filter(isNonNullable) as NavTreeItemGraphNode[];
};

/**
 * Determines whether a node should be visible based on its disposition.
 */
export const filterItems = (node: Node.Node, disposition?: string) => {
  if (!disposition && (node.properties.disposition === 'hidden' || node.properties.disposition === 'alternate-tree')) {
    return false;
  } else if (!disposition) {
    const action = Node.isAction(node);
    return !action || node.properties.disposition === 'item';
  } else {
    return node.properties.disposition === disposition;
  }
};

export const l0ItemType = (item: Node.Node) => {
  if (Node.isActionLike(item)) {
    return 'action';
  } else {
    return 'tab';
  }
};
