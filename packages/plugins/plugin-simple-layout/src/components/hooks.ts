//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { Graph } from '@dxos/plugin-graph';

/**
 * Hook to expand graph nodes two levels deep when directly linked to.
 */
export const useLoadDescendents = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    if (nodeId) {
      // First level: expand the node itself.
      Graph.expand(graph, nodeId, 'outbound');
      // Second level: expand each child.
      Graph.getConnections(graph, nodeId, 'outbound').forEach((child) => {
        Graph.expand(graph, child.id, 'outbound');
      });
    }
  }, [nodeId, graph]);
};
