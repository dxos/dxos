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
import { Path } from '@dxos/react-ui-mosaic';
import {
  type NavTreeActionNode,
  type NavTreeItemActions,
  type NavTreeItemNode,
  type NavTreeItemNodeProperties,
  type OpenItemIds,
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

type FlattenedActions = Required<Pick<NavTreeItemNode, 'actions' | 'groupedActions'>>;

export const getActions = (graph: Graph, node: NavTreeItemGraphNode): FlattenedActions => {
  return graph.actions(node).reduce(
    (acc: FlattenedActions, arg) => {
      acc.actions.push(arg as unknown as NavTreeItemActions[number]);
      if (!isAction(arg)) {
        const actionGroup = graph.actions(arg);
        acc.groupedActions[arg.id] = actionGroup as unknown as NavTreeActionNode[];
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

function* navTreeItemVisitor(
  graph: Graph,
  node: NavTreeItemGraphNode,
  openItemIds: OpenItemIds,
  path: string[] = [],
  filter?: NodeFilter,
): Generator<NavTreeItem> {
  const l0Children = getChildren(graph, node, filter, path);
  const { actions: l0Actions, groupedActions: l0GroupedActions } = getActions(graph, node);

  const stack: NavTreeItem[] = [
    {
      id: Path.create(node.id),
      node,
      path: [node.id],
      parentOf: (l0Children ?? []).map(({ id }) => id),
      actions: l0Actions,
      groupedActions: l0GroupedActions,
    },
  ];

  while (stack.length > 0) {
    const nextItem = stack.pop()!;
    if ((nextItem.path?.length ?? 0) > 1) {
      yield nextItem;
    }
    const { id, node, path } = nextItem;
    const children = getChildren(graph, node, filter, path);
    if ((path?.length ?? 0) === 1 || (id ?? 'never') in openItemIds) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i] as NavTreeItemGraphNode;
        const childPath = path ? [...path, child.id] : [child.id];
        const childChildren = getChildren(graph, child, filter, childPath);
        const { actions: childActions, groupedActions: childGroupedActions } = getActions(graph, child);
        stack.push({
          id: Path.create(...childPath),
          node: child,
          path: childPath,
          ...((childChildren?.length ?? 0) > 0 && {
            parentOf: childChildren!.map(({ id }) => Path.create(...childPath, id)),
          }),
          actions: childActions,
          groupedActions: childGroupedActions,
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
  openItemIds: OpenItemIds,
  path: string[] = [],
  filter?: NodeFilter,
): NavTreeItem[] => {
  return Array.from(navTreeItemVisitor(graph, rootNode, openItemIds, path, filter));
};

export const expandOpenGraphNodes = (graph: Graph, openItemIds: OpenItemIds) => {
  return Promise.all(
    Object.keys(openItemIds)
      .map((openItemId) => {
        const node = graph.findNode(Path.last(openItemId));
        return node && expandChildrenAndActions(graph, node as NavTreeItemGraphNode);
      })
      .filter(nonNullable),
  );
};
