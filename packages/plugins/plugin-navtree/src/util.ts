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
  path: readonly string[],
): NavTreeNode.NavTreeItemGraphNode | undefined => {
  const parentId = path[path.length - 2];
  return AppGraph.getConnections(graph, node.id, AppGraph.inverseRelation(AppGraphNode.child)).find(
    (n: AppGraphNode.Node) => n.id === parentId,
  ) as NavTreeNode.NavTreeItemGraphNode | undefined;
};

export type DropOperation = 'move' | 'link' | 'reject';

export const resolveDropOperation = ({
  source,
  sourceParent,
  destination,
}: {
  source: NavTreeNode.NavTreeItemGraphNode;
  sourceParent?: NavTreeNode.NavTreeItemGraphNode;
  destination?: NavTreeNode.NavTreeItemGraphNode;
}): DropOperation => {
  const { persistenceClass, persistenceKey } = source.properties;
  if (
    !destination ||
    destination.id === sourceParent?.id ||
    !persistenceClass ||
    !persistenceKey ||
    !destination.properties.acceptPersistenceClass?.has(persistenceClass) ||
    !destination.properties.acceptPersistenceKey?.has(persistenceKey)
  ) {
    return 'reject';
  }

  const scope = destination.properties.moveScope;
  if (scope && sourceParent?.properties.moveScope === scope && destination.properties.onMove) {
    return 'move';
  }
  return destination.properties.onLink ? 'link' : 'reject';
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
