//
// Copyright 2023 DXOS.org
//

import {
  type Action,
  type Node,
  type NodeFilter,
  type Graph,
  ACTION_TYPE,
  ACTION_GROUP_TYPE,
  isAction,
} from '@dxos/app-graph';
import { nonNullable } from '@dxos/util';

import { type FlattenedActions, type NavTreeItemGraphNode } from './types';

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

    if (a.properties.disposition === 'toolbar') {
      return -1;
    }

    return 1;
  });

export const getChildren = (
  graph: Graph,
  node: NavTreeItemGraphNode,
  filter?: NodeFilter,
  path: readonly string[] = [],
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

export const getActions = (graph: Graph, node: Node): FlattenedActions => {
  return graph.actions(node).reduce(
    (acc: FlattenedActions, arg) => {
      if (arg.properties.disposition === 'item') {
        return acc;
      }

      acc.actions.push(arg);
      if (!isAction(arg)) {
        const actionGroup = graph.actions(arg);
        acc.groupedActions[arg.id] = actionGroup;
      }
      return acc;
    },
    { actions: [], groupedActions: {} },
  );
};

export const expandChildrenAndActions = (graph: Graph, node: Node) => {
  return Promise.all([expandChildren(graph, node), expandActions(graph, node)]);
};

export const expandChildren = (graph: Graph, node: Node) => {
  return graph.expand(node, 'outbound');
};

export const expandActions = (graph: Graph, node: Node) => {
  return Promise.all([graph.expand(node, 'outbound', ACTION_TYPE), graph.expand(node, 'outbound', ACTION_GROUP_TYPE)]);
};
