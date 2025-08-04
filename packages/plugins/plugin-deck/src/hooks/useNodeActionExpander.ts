//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { type Node, getGraph } from '@dxos/plugin-graph';

export const useNodeActionExpander = (node?: Node) => {
  useEffect(() => {
    if (node) {
      const frame = requestAnimationFrame(() => {
        const graph = getGraph(node);
        void graph.expand(node.id);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [node]);
};
