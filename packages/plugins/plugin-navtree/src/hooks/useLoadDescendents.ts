//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Node } from '@dxos/app-graph';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph } from '@dxos/plugin-graph';

/**
 * Eagerly expands a root node and its immediate children in the app graph.
 * Avoid using within the tree items as it is heavy.
 */
export const useLoadDescendents = (root?: Node.Node) => {
  const { graph } = useAppGraph();
  useEffect(() => {
    if (!root) {
      return;
    }
    Graph.expand(graph, root.id, 'outbound');
    Graph.getConnections(graph, root.id, 'outbound').forEach((child) => {
      Graph.expand(graph, child.id, 'outbound');
    });
  }, [graph, root]);
};
