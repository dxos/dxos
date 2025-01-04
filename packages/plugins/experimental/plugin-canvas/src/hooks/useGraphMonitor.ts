//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import type { GraphMonitor } from './context';
import { type ComputeNode, type StateMachine } from '../compute';
import type { BaseComputeShape, ComputeShape } from '../compute/shapes/defs';
import type { Connection } from '../types';

// TODO(burdon): Figure out sync.
// TODO(burdon): Make state machine reactive.
export const useGraphMonitor = (machine?: StateMachine): GraphMonitor => {
  return useMemo<GraphMonitor>(
    () => ({
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
    }),
    [machine],
  );
};
