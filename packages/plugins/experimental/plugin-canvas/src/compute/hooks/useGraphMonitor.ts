//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type ComputeGraphModel } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';

import { type GraphMonitor } from '../../hooks';
import { type Connection } from '../../types';
import { createComputeNode, isValidComputeNode } from '../graph';
import { type ComputeShape } from '../shapes';
import { nonNullable } from '@dxos/util';

/**
 * Listens for changes to the graph and updates the compute graph.
 * @param graph Compute graph to update on change.
 */
// TODO(burdon): Generalize into sync function.
export const useGraphMonitor = (graph?: ComputeGraphModel): GraphMonitor => {
  return useMemo<GraphMonitor>(() => {
    return {
      // TODO(burdon): onDelete.
      onCreate: ({ node }) => {
        if (!graph) {
          return;
        }

        // Ignore shapes that don't have a corresponding node factory.
        invariant(node.data.type);
        if (!isValidComputeNode(node.data.type)) {
          return;
        }

        // TODO(burdon): Check type (e.g., ignore comments).
        const computeNode = createComputeNode(node as GraphNode<ComputeShape>);
        graph.addNode(computeNode);

        // TODO(burdon): Create node first then remove optional node.id from shape?
        (node as GraphNode<ComputeShape>).data.node = computeNode.id;
      },

      // TODO(burdon): onUnlink.
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

      onDelete: ({ subgraph }) => {
        if (graph) {
          const computeNodeIds = subgraph.nodes.map((node) => (node.data as ComputeShape).node) as string[];
          const edgeIdsToRemove = subgraph.edges
            .map((shapeEdge) => {
              return graph.edges.find((computeEdge) => {
                const edgeData = computeEdge.data as Connection;
                const shapeData = shapeEdge.data as Connection;
                return edgeData.input === shapeData.input && edgeData.output === shapeData.output;
              })?.id;
            })
            .filter(nonNullable);

          graph.removeNodes(computeNodeIds);
          graph.removeEdges(edgeIdsToRemove);
        }
      },
    };
  }, [graph]);
};
