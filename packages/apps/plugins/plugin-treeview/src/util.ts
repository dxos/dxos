//
// Copyright 2023 DXOS.org
//

import { getAppStateIndex, SetTileHandler } from '@braneframe/plugin-dnd';
import { Action, Graph, Node } from '@braneframe/plugin-graph';
import { AppState } from '@braneframe/types';
import type { TFunction } from '@dxos/aurora';
import { getDndId, MosaicState } from '@dxos/aurora-grid';

import { TREE_VIEW_PLUGIN } from './types';

export const getLevel = (node: Node, level = 0): number => {
  if (!node.parent) {
    return level;
  } else {
    return getLevel(node.parent, level + 1);
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

// NOTE: This is the same as @tldraw/indices implementation but working on Graph.Node properties.
export const sortByIndex = (a: Node, b: Node) => {
  if (a.properties.index < b.properties.index) {
    return -1;
  } else if (a.properties.index > b.properties.index) {
    return 1;
  }
  return 0;
};

// TODO(wittjosiah): Why fallbackTitle?
export const getTreeItemLabel = (node: Node, t: TFunction) =>
  node.properties?.preferFallbackTitle
    ? Array.isArray(node.properties.fallbackTitle)
      ? t(...(node.properties.fallbackTitle as [string, { ns: string }]))
      : node.properties.fallbackTitle
    : Array.isArray(node.label)
    ? t(...node.label)
    : node.label;

export const getPersistenceParent = (node: Node, persistenceClass: string): Node | null => {
  if (!node || !node.parent) {
    return null;
  }

  if (node.parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return node.parent;
  } else {
    return getPersistenceParent(node.parent, persistenceClass);
  }
};

export const computeTreeViewMosaic = (graph: Graph, appState: AppState, onSetTile: SetTileHandler) => {
  const mosaic: MosaicState = { tiles: {}, relations: {} };

  graph.traverse({
    visitor: (node) => {
      const level = getLevel(node, -1);
      const id = getDndId(TREE_VIEW_PLUGIN, node.id);
      mosaic.tiles[id] = onSetTile(
        {
          id,
          index:
            node.properties.persistenceClass === 'appState'
              ? getAppStateIndex(node.id, appState)
              : node.properties.index,
          variant: 'treeitem',
          sortable: true,
          expanded: false,
          level,
          ...(node.properties.acceptPersistenceClass && {
            acceptMigrationClass: node.properties.acceptPersistenceClass,
          }),
          ...(node.properties.persistenceClass && { migrationClass: node.properties.persistenceClass }),
        },
        node,
      );
      mosaic.relations[id] = {
        child: new Set(),
        parent: new Set(),
      };
    },
  });

  graph.traverse({
    visitor: (node) => {
      const id = getDndId(TREE_VIEW_PLUGIN, node.id);
      if (node.children && node.children.length) {
        node.children.forEach((child) => {
          const childId = getDndId(TREE_VIEW_PLUGIN, child.id);
          mosaic.relations[id].child.add(childId);
          mosaic.relations[childId].parent.add(id);
        });
      }
    },
  });

  return mosaic;
};
