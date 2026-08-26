//
// Copyright 2023 DXOS.org
//

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { isNonNullable } from '@dxos/util';

import { NavTreeNode } from '#types';

export const getParent = (
  graph: AppGraph.ReadableGraph,
  node: NavTreeNode.NavTreeItemGraphNode,
  path: string[],
): NavTreeNode.NavTreeItemGraphNode | undefined => {
  const parentId = path[path.length - 2];
  return AppGraph.getConnections(graph, node.id, AppGraphNode.childRelation('inbound')).find(
    (n: AppGraphNode.Node) => n.id === parentId,
  ) as NavTreeNode.NavTreeItemGraphNode | undefined;
};

export const getPersistenceParent = (
  graph: AppGraph.ReadableGraph,
  node: NavTreeNode.NavTreeItemGraphNode,
  path: string[],
  persistenceClass: string,
): NavTreeNode.NavTreeItemGraphNode | null => {
  if (node.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return node;
  } else {
    const parent = getParent(graph, node, path);
    return parent ? getPersistenceParent(graph, parent, path.slice(0, path.length - 1), persistenceClass) : null;
  }
};

export const resolveMigrationOperation = (
  graph: AppGraph.ReadableGraph,
  activeNode: NavTreeNode.NavTreeItemGraphNode,
  destinationPath: string[],
  destinationRelatedNode?: NavTreeNode.NavTreeItemGraphNode,
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
export const sortActions = (actions: AppGraphNode.Action[]): AppGraphNode.Action[] =>
  actions.sort((a, b) => {
    const aPrimary = AppGraphNode.hasDisposition(a, 'list-item-primary');
    const bPrimary = AppGraphNode.hasDisposition(b, 'list-item-primary');
    if (aPrimary === bPrimary) {
      return 0;
    }

    return aPrimary ? -1 : 1;
  });

export const getChildren = (
  graph: AppGraph.ReadableGraph,
  node: NavTreeNode.NavTreeItemGraphNode,
  path: readonly string[] = [],
): NavTreeNode.NavTreeItemGraphNode[] => {
  return AppGraph.getConnections(graph, node.id, 'child')
    .map((n: AppGraphNode.Node) => {
      // Break cycles.
      const nextPath = [...path, node.id];
      return nextPath.includes(n.id) ? undefined : (n as NavTreeNode.NavTreeItemGraphNode);
    })
    .filter(isNonNullable) as NavTreeNode.NavTreeItemGraphNode[];
};

/**
 * Determines whether a node should be visible based on its disposition.
 */
export const filterItems = (node: AppGraphNode.Node, disposition?: string) => {
  if (!disposition && AppGraphNode.hasDisposition(node, 'hidden')) {
    return false;
  } else if (!disposition) {
    const action = AppGraphNode.isAction(node);
    return !action || AppGraphNode.hasDisposition(node, 'item');
  } else {
    return AppGraphNode.hasDisposition(node, disposition);
  }
};

export const l0ItemType = (item: AppGraphNode.Node) => {
  if (AppGraphNode.isActionLike(item)) {
    return 'action';
  } else {
    return 'tab';
  }
};
