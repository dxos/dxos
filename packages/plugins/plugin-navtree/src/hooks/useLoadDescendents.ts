//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as Graph from '@dxos/app-graph/Graph';
import { useAppGraph } from '@dxos/app-toolkit/ui';

/**
 * Expands a root node in the app graph.
 */
export const useLoadDescendents = (root?: AppGraphNode.Node) => {
  const { graph } = useAppGraph();
  useEffect(() => {
    if (!root) {
      return;
    }

    Graph.expandSync(graph, root.id, 'child');
  }, [graph, root]);
};
