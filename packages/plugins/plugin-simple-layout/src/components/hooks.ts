//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph } from '@dxos/plugin-graph';
import { Attention } from '@dxos/react-ui-attention';

/**
 * Expand graph nodes along the full path from root to the given node ID.
 * Walks each progressive prefix, ensuring ancestor nodes are materialized
 * before attempting to access their children.
 */
export const useExpandPath = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    if (nodeId) {
      for (const prefix of Attention.expandAttendableId(nodeId)) {
        Graph.expand(graph, prefix, 'child');
      }
    }
  }, [nodeId, graph]);
};
