//
// Copyright 2023 DXOS.org
//

import { type Action, type Node, type NodeFilter, type Graph, isAction } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { Treegrid } from '@dxos/react-ui';
import {
  type NavTreeActionNode,
  type NavTreeActionsNode,
  type NavTreeItemNode,
  type NavTreeItemNodeProperties,
} from '@dxos/react-ui-navtree';
import { getHostPlatform, nonNullable } from '@dxos/util';

import { KEY_BINDING } from './meta';

export type NavTreeItemGraphNode = Node<any, NavTreeItemNodeProperties>;
export type NavTreeItem = NavTreeItemNode<NavTreeItemGraphNode>;

export const getPersistenceParent = (
  graph: Graph,
  node: Node,
  path: string[],
  persistenceClass: string,
): Node | null => {
  const parentId = path[path.length - 1];
  const parent = graph.nodes(node, { relation: 'inbound' }).find((n) => n.id === parentId);
  if (!node || !parent) {
    return null;
  }

  if (parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return parent;
  } else {
    return getPersistenceParent(graph, parent, path.slice(0, path.length - 1), persistenceClass);
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

export const getActions = (graph: Graph, node: NavTreeItemGraphNode, path: string[]) => {
  return graph
    .actions(node, {
      onlyLoaded: true,
    })
    .map((action) => {
      const isGroup = !isAction(action);
      let shortcut: string | undefined;
      if (!isGroup) {
        if (typeof action.properties.keyBinding === 'object') {
          const availablePlatforms = Object.keys(action.properties.keyBinding);
          const platform = getHostPlatform();
          shortcut = availablePlatforms.includes(platform)
            ? action.properties.keyBinding[platform]
            : platform === 'ios'
              ? action.properties.keyBinding.macos // Fallback to macos if ios-specific bindings not provided.
              : platform === 'linux' || platform === 'unknown'
                ? action.properties.keyBinding.windows // Fallback to windows if platform-specific bindings not provided.
                : undefined;
        } else {
          shortcut = action.properties.keyBinding;
        }

        if (shortcut) {
          Keyboard.singleton.getContext(path.slice(0, -1).join('/')).bind({
            shortcut,
            handler: () => {
              void action.data({ node: action, caller: KEY_BINDING });
            },
            data: action.properties.label,
          });
        }
      }
      return isGroup
        ? (action as unknown as NavTreeActionsNode)
        : ({
            ...action,
            invoke: action.data,
            keyBinding: shortcut,
          } as unknown as NavTreeActionNode);
    });
};

function* visitor(
  graph: Graph,
  node: NavTreeItemGraphNode,
  openItemPaths: Set<string>,
  path: string[] = [],
  filter?: NodeFilter,
): Generator<NavTreeItem> {
  const l0Children = getChildren(graph, node, filter, path);
  const l0Actions = getActions(graph, node, path);

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
        const childActions = getActions(graph, child, childPath);
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
