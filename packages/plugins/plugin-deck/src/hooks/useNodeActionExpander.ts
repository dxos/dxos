//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

export const useNodeActionExpander = (node?: AppGraphNode.Node) => {
  useEffect(() => {
    if (node) {
      const frame = requestAnimationFrame(() => {
        const graph = AppGraph.getGraph(node);
        void AppGraph.expandSync(graph, node.id, 'action');
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [node]);
};
