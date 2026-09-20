//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type ComputeEdge, ComputeGraphModel, DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { invariant } from '@dxos/invariant';
import { type CanvasBoard, type CanvasGraphModel, type GraphMonitor } from '@dxos/react-ui-canvas-editor';

import { deleteTriggerObjects, syncCreate, syncDelete, syncLink } from '../graph/index.ts';
import { type ComputeShape } from '../shapes/index.ts';

/**
 * Map canvas edge to compute edge.
 */
export const mapEdge = (
  graph: CanvasGraphModel,
  { source, target, output = DEFAULT_OUTPUT, input = DEFAULT_INPUT }: CanvasBoard.Connection,
): Omit<ComputeEdge, 'id'> => {
  const sourceNode = graph.findNode(source) as ComputeShape;
  const targetNode = graph.findNode(target) as ComputeShape;
  invariant(sourceNode?.node);
  invariant(targetNode?.node);

  return {
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
        const computeNode = syncCreate(model, node);
        if (computeNode) {
          node.node = computeNode.id;
        }
      },

      onLink: ({ graph, edge }) => {
        if (model) {
          syncLink(model, mapEdge(graph, edge));
        }
      },

      onDelete: ({ graph, subgraph }) => {
        if (model) {
          const shapes = subgraph.nodes as ComputeShape[];
          const nodeIds = shapes.map((shape) => shape.node).filter((id): id is string => id !== undefined);
          // An edge's far end may survive the deletion, so it is looked up in the whole graph.
          const computeId = (id: string) =>
            ((subgraph.findNode(id) ?? graph.findNode(id)) as ComputeShape | undefined)?.node ?? '';
          const links = subgraph.edges.map(({ source, target, output, input }) => ({
            source: computeId(source),
            target: computeId(target),
            output,
            input,
          }));
          syncDelete(model, nodeIds, links);
          deleteTriggerObjects(model, shapes);
        }
      },
    };
  }, [model]);
};

export const createComputeGraph = (graph?: CanvasGraphModel<ComputeShape>) => {
  const computeGraph = ComputeGraphModel.create();

  if (graph) {
    for (const shape of graph.nodes) {
      const node = syncCreate(computeGraph, shape);
      if (node) {
        shape.node = node.id;
      }
    }

    for (const edge of graph.edges) {
      syncLink(computeGraph, mapEdge(graph, edge));
    }
  }

  return computeGraph;
};
