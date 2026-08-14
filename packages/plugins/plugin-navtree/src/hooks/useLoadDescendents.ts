//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import * as Graph from '@dxos/app-graph/Graph';
import type * as Node from '@dxos/app-graph/Node';
import { useAppGraph } from '@dxos/app-toolkit/ui';

/**
 * Expands a root node in the app graph.
 */
export const useLoadDescendents = (root?: Node.Node) => {
  const { graph } = useAppGraph();
  useEffect(() => {
    if (!root) {
      return;
    }

    Graph.expandSync(graph, root.id, 'child');
  }, [graph, root]);
};
