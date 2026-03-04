//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph } from '@dxos/plugin-graph';

/**
 * Hook to expand graph nodes two levels deep when directly linked to.
 */
export const useLoadDescendents = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    if (nodeId) {
      // First level: expand the node itself.
      Graph.expand(graph, nodeId, 'child');
      // Second level: expand each child.
      Graph.getConnections(graph, nodeId, 'child').forEach((child) => {
        Graph.expand(graph, child.id, 'child');
      });
    }
  }, [nodeId, graph]);
};
