//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Node } from '@dxos/app-graph';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph } from '@dxos/plugin-graph';

/**
 * Expands a root node in the app graph.
 */
export const useLoadDescendents = (root?: Node.Node) => {
  const { graph } = useAppGraph();
  useEffect(() => {
    if (!root) {
      return;
    }

    Graph.expand(graph, root.id, 'child');
  }, [graph, root]);
};
