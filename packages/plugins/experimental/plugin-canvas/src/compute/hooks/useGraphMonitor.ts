//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type ComputeGraphModel } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant } from '@dxos/invariant';

import { type GraphMonitor } from '../../hooks';
import { type Connection } from '../../types';
import { createComputeNode } from '../graph';
import { type ComputeShape } from '../shapes';

/**
 * Listens for changes to the graph and updates the compute graph.
 * @param graph Compute graph to update on change.
 */
export const useGraphMonitor = (graph?: ComputeGraphModel): GraphMonitor => {
  return useMemo<GraphMonitor>(() => {
    return {
      onCreate: ({ node }) => {
        if (!graph) {
          return;
        }

        // TODO(burdon): Check type (e.g., ignore comments).
        const computeNode = createComputeNode(node as GraphNode<ComputeShape>);
        graph.addNode(computeNode);

        // TODO(burdon): Create node first then remove optional node.id from shape?
        (node as GraphNode<ComputeShape>).data.node = computeNode.id;
      },

      onLink: ({ graph: model, edge }) => {
        if (graph) {
          // TODO(burdon): Check type.
          const data = edge.data as Connection;
          const { output, input } = data ?? {};

          const sourceNode = model.findNode(edge.source) as GraphNode<ComputeShape>;
          const targetNode = model.findNode(edge.target) as GraphNode<ComputeShape>;

          graph.addEdge({
            id: ObjectId.random(),
            source: sourceNode?.data.node ?? failedInvariant(),
            target: targetNode?.data.node ?? failedInvariant(),
            data: { output, input },
          });
        }
      },
    };
  }, [graph]);
};
