//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type ComputeGraphModel } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { type GraphMonitor } from '../../hooks';
import { type Connection } from '../../types';
import { createComputeNode, isValidComputeNode } from '../graph';
import { type ComputeShape } from '../shapes';

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
            output,
            input,
          });
        }
      },

      onDelete: ({ subgraph }) => {
        if (graph) {
          const nodeIds = subgraph.nodes.map((node) => (node.data as ComputeShape).node) as string[];

          // NOTE(ZaymonFC): Based on the information we have, this is O(edges to remove * compute edges).
          const edgeIds = subgraph.edges
            .map((shapeEdge) => {
              return graph.edges.find((computeEdge) => {
                const computeConnection = computeEdge.data as Connection;
                const canvasConnection = shapeEdge.data as Connection;
                return (
                  computeConnection.input === canvasConnection.input &&
                  computeConnection.output === canvasConnection.output
                );
              })?.id;
            })
            .filter(nonNullable);

          graph.removeNodes(nodeIds);
          graph.removeEdges(edgeIds);
        }
      },
    };
  }, [graph]);
};