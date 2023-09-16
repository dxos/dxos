//
// Copyright 2023 DXOS.org
//

import { Graph } from '@braneframe/plugin-graph';
import { AppState } from '@braneframe/types';
import type { TFunction } from '@dxos/aurora';
import { getDndId, MosaicState } from '@dxos/aurora-grid';

import { getLevel } from './components/useGraphMosaic';
import { TREE_VIEW_PLUGIN } from './types';

export const uriToActive = (uri: string) => {
  const [_, ...nodeId] = uri.split('/');
  return nodeId ? nodeId.join(':') : undefined;
};

export const activeToUri = (active?: string) =>
  '/' + (active ? active.split(':').map(encodeURIComponent).join('/') : '');

// TODO(wittjosiah): Move into node implementation?
export const sortActions = (actions: Graph.Action[]): Graph.Action[] =>
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
export const sortByIndex = (a: Graph.Node, b: Graph.Node) => {
  if (a.properties.index < b.properties.index) {
    return -1;
  } else if (a.properties.index > b.properties.index) {
    return 1;
  }
  return 0;
};

export const getTreeItemLabel = (node: Graph.Node, t: TFunction) =>
  node.properties?.preferFallbackTitle
    ? Array.isArray(node.properties.fallbackTitle)
      ? t(...(node.properties.fallbackTitle as [string, { ns: string }]))
      : node.properties.fallbackTitle
    : Array.isArray(node.label)
    ? t(...node.label)
    : node.label;

export const getPersistenceParent = (node: Graph.Node, persistenceClass: string): Graph.Node | null => {
  if (!node || !node.parent) {
    return null;
  }

  if (node.parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return node.parent;
  } else {
    return getPersistenceParent(node.parent, persistenceClass);
  }
};

export const getAppStateIndex = (id: string, appState?: AppState): string | undefined => {
  return appState?.indices?.find(({ ref }) => ref === id)?.value;
};

export const setAppStateIndex = (id: string, value: string, appState?: AppState): string => {
  const entryIndex = appState?.indices?.findIndex(({ ref }) => ref === id);
  if (typeof entryIndex !== 'undefined' && entryIndex > -1) {
    appState!.indices = [
      ...appState!.indices.slice(0, entryIndex),
      { ref: id, value },
      ...appState!.indices.slice(entryIndex + 1, appState!.indices.length),
    ];
  } else if (appState) {
    appState.indices.push({ ref: id, value });
  }
  return value;
};

export const computeTreeViewMosaic = (graph: Graph) => {
  const mosaic: MosaicState = { tiles: {}, relations: {} };

  graph.traverse({
    onVisitNode: (node) => {
      const level = getLevel(node, -1);
      const id = getDndId(TREE_VIEW_PLUGIN, node.id);
      mosaic.tiles[id] = {
        id,
        index: node.properties.index,
        variant: 'treeitem',
        sortable: true,
        expanded: false,
        level,
        acceptMigrationClass: node.properties.acceptMigrationClass,
        migrationClass: node.properties.migrationClass,
      };
      mosaic.relations[id] = {
        child: new Set(),
        parent: new Set(),
      };
    },
  });

  graph.traverse({
    onVisitNode: (node) => {
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
