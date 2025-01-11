//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type GraphMonitor } from './context';
import { type ComputeNode, type StateMachine, type BaseComputeShape, type ComputeShape } from '../compute';
import { type Connection } from '../types';

export const useGraphMonitor = (machine?: StateMachine): GraphMonitor => {
  return useMemo<GraphMonitor>(() => {
    return {
      onCreate: (node) => {
        if (machine) {
          const data = node.data as ComputeShape<BaseComputeShape, ComputeNode<any, any>>;
          // TODO(burdon): Check type (e.g., could be just decorative).
          machine.graph.addNode({ id: data.id, data: data.node });
          void machine.open(); // TODO(burdon): Make automatic.
        }
      },

      onLink: (edge) => {
        if (machine) {
          // TODO(burdon): Check type.
          const data = edge.data as Connection;
          const { input, output } = data ?? {};
          machine.graph.addEdge({ id: edge.id, source: edge.source, target: edge.target, data: { input, output } });
          void machine.open();
        }
      },
    };
  }, [machine]);
};
