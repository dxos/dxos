//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { Graph, type Node } from '@dxos/plugin-graph';

export const useNodeActionExpander = (node?: Node.Node) => {
  useEffect(() => {
    if (node) {
      const frame = requestAnimationFrame(() => {
        const graph = Graph.getGraph(node);
        void Graph.expand(graph, node.id);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [node]);
};
