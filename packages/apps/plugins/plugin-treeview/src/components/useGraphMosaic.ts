//
// Copyright 2023 DXOS.org
//

import { batch } from '@preact/signals-react';
import { useEffect } from 'react';

import { Graph, useGraph } from '@braneframe/plugin-graph';
import { getDndId, useMosaic } from '@dxos/aurora-grid';

import { TREE_VIEW_PLUGIN } from '../types';

export const getLevel = (node: Graph.Node, level = 0): number => {
  if (!node.parent) {
    return level;
  } else {
    return getLevel(node.parent, level + 1);
  }
};

export const useGraphMosaic = () => {
  const { graph } = useGraph();
  const {
    mosaic: { tiles, relations },
  } = useMosaic();

  useEffect(() => {
    console.log('[use graph mosaic]', 'init');
    batch(() => {
      console.log('[use graph mosaic]', 'batch');
      graph.traverse({
        onVisitNode: (node) => {
          const level = getLevel(node, -1);
          const id = getDndId(TREE_VIEW_PLUGIN, node.id);
          tiles[id] = {
            id,
            index: node.properties.index,
            variant: 'treeitem',
            sortable: true,
            expanded: false,
            level,
            acceptMigrationClass: node.properties.acceptMigrationClass,
            migrationClass: node.properties.migrationClass,
          };
          relations[id] = { child: relations[id]?.child ?? new Set(), parent: relations[id]?.parent ?? new Set() };
        },
      });

      graph.traverse({
        onVisitNode: (node) => {
          const id = getDndId(TREE_VIEW_PLUGIN, node.id);
          if (node.children && node.children.length) {
            node.children.forEach((child) => {
              const childId = getDndId(TREE_VIEW_PLUGIN, child.id);
              relations[id].child.add(childId);
              relations[childId].parent.add(id);
            });
          }
        },
      });
    });
  }, [graph.root, tiles, relations]);
};
