//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type ComputeEdge, type ComputeGraphModel } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { type GraphMonitor } from '../../hooks';
import { type CanvasGraphModel, type Connection } from '../../types';
import { createComputeNode, isValidComputeNode } from '../graph';
import { type ComputeShape } from '../shapes';

/**
 * Map canvas edge to compute edge.
 */
export const mapEdge = (graph: CanvasGraphModel, { source, target, output, input }: Connection): ComputeEdge => {
  const sourceNode = graph.findNode(source) as ComputeShape;
  const targetNode = graph.findNode(target) as ComputeShape;
  console.log(sourceNode, targetNode, output, input);
  invariant(sourceNode?.node);
  invariant(targetNode?.node);
  invariant(output);
  invariant(input);

  return {
    id: ObjectId.random(),
    source: sourceNode.node,
    target: targetNode.node,
    output,
    input,
  };
};

/**
 * Listens for changes to the graph and updates the compute graph.
 * @param model Compute graph to update on change.
 */
// TODO(burdon): Generalize into sync function.
export const useGraphMonitor = (model?: ComputeGraphModel): GraphMonitor<ComputeShape> => {
  return useMemo<GraphMonitor<ComputeShape>>(() => {
    return {
      onCreate: ({ node }) => {
        if (!model) {
          return;
        }

        // Ignore shapes that don't have a corresponding node factory.
        invariant(node.type);
        if (!isValidComputeNode(node.type)) {
          return;
        }

        const computeNode = createComputeNode(node);
        model.addNode(computeNode);
        node.node = computeNode.id;
      },

      onLink: ({ graph, edge }) => {
        if (model) {
          model.addEdge(mapEdge(graph, edge));
        }
      },

      onDelete: ({ subgraph }) => {
        if (model) {
          const nodeIds = subgraph.nodes.map((shape) => (shape as ComputeShape).node) as string[];

          // NOTE(ZaymonFC): Based on the information we have, this is O(edges to remove * compute edges).
          const edgeIds = subgraph.edges
            .map((shapeEdge) => {
              return model.edges.find(
                (computeEdge) => computeEdge.input === shapeEdge.input && computeEdge.output === shapeEdge.output,
              )?.id;
            })
            .filter(nonNullable);

          model.removeNodes(nodeIds);
          model.removeEdges(edgeIds);
        }
      },
    };
  }, [model]);
};
