//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type GraphNode } from '@dxos/graph';

import { type GraphMonitor } from '../../hooks';
import { type Connection } from '../../types';
import { createComputeNode } from '../graph';
import { type StateMachine } from '../graph';
import { type ComputeShape } from '../shapes';

export const useGraphMonitor = (machine?: StateMachine): GraphMonitor => {
  return useMemo<GraphMonitor>(() => {
    return {
      onCreate: (shape) => {
        if (!machine) {
          return;
        }

        // TODO(burdon): Check type (e.g., ignore comments).
        const computeNode = createComputeNode(shape as GraphNode<ComputeShape>);
        machine.addNode(computeNode);
        // TODO(burdon): Create node first then remove optional node.id from shape?
        (shape as GraphNode<ComputeShape>).data.node = computeNode.id;
      },

      onLink: (edge) => {
        if (machine) {
          // TODO(burdon): Check type.
          const data = edge.data as Connection;
          const { output, input } = data ?? {};
          // TODO(burdon): Edge id? Need to specialize based on in/out.
          machine.addEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            data: { output, input },
          });
        }
      },
    };
  }, [machine]);
};
