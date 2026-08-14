//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
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

    AppGraph.expandSync(graph, root.id, 'child');
  }, [graph, root]);
};
