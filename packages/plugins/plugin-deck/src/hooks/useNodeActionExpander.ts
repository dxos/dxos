//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import * as Graph from '@dxos/app-graph/Graph';
import type * as Node from '@dxos/app-graph/Node';

export const useNodeActionExpander = (node?: Node.Node) => {
  useEffect(() => {
    if (node) {
      const frame = requestAnimationFrame(() => {
        const graph = Graph.getGraph(node);
        void Graph.expandSync(graph, node.id, 'action');
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [node]);
};
