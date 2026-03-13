//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { expandAttendableId } from '@dxos/react-ui-attention';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph } from '@dxos/plugin-graph';

/**
 * Expand graph nodes along the full path from root to the given node ID.
 * Walks each progressive prefix, ensuring ancestor nodes are materialized
 * before attempting to access their children.
 */
export const useExpandPath = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    if (nodeId) {
      for (const prefix of expandAttendableId(nodeId)) {
        Graph.expand(graph, prefix, 'child');
      }
    }
  }, [nodeId, graph]);
};
