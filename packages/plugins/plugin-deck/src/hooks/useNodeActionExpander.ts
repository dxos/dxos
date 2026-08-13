//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as Graph from '@dxos/app-graph/Graph';

export const useNodeActionExpander = (node?: AppGraphNode.Node) => {
  useEffect(() => {
    if (node) {
      const frame = requestAnimationFrame(() => {
        const graph = Graph.getGraph(node);
        void Graph.expand(graph, node.id, 'action');
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [node]);
};
