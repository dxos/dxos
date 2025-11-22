//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type ComputeEdge, ComputeGraphModel, type ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { getSpace } from '@dxos/react-client/echo';
import { type CanvasGraphModel, type Connection, type GraphMonitor } from '@dxos/react-ui-canvas-editor';
import { isNonNullable } from '@dxos/util';

import { createComputeNode, isValidComputeNode } from '../graph';
import { type ComputeShape, type TriggerShape } from '../shapes';

/**
 * Map canvas edge to compute edge.
 */
export const mapEdge = (
  graph: CanvasGraphModel,
  { source, target, output = DEFAULT_OUTPUT, input = DEFAULT_INPUT }: Connection,
): ComputeEdge => {
  const sourceNode = graph.findNode(source) as ComputeShape;
  const targetNode = graph.findNode(target) as ComputeShape;
  invariant(sourceNode?.node);
  invariant(targetNode?.node);

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
        if (node.type === 'trigger') {
          linkTriggerToCompute(model, computeNode, node as TriggerShape);
        }
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
            .map(({ source, target, output = DEFAULT_OUTPUT, input = DEFAULT_INPUT }) => {
              return model.edges.find((computeEdge) => computeEdge.input === input && computeEdge.output === output)
                ?.id;
            })
            .filter(isNonNullable);

          model.removeNodes(nodeIds);
          model.removeEdges(edgeIds);

          deleteTriggerObjects(model, subgraph);
        }
      },
    };
  }, [model]);
};

export const createComputeGraph = (graph?: CanvasGraphModel<ComputeShape>) => {
  const computeGraph = ComputeGraphModel.create();

  if (graph) {
    for (const shape of graph.nodes) {
      if (isValidComputeNode(shape.type)) {
        const node = createComputeNode(shape);
        computeGraph.addNode(node);
        shape.node = node.id;
      }
    }

    for (const edge of graph.edges) {
      computeGraph.addEdge(mapEdge(graph, edge));
    }
  }

  return computeGraph;
};

const linkTriggerToCompute = (graph: ComputeGraphModel, computeNode: ComputeNode, triggerData: TriggerShape) => {
  const functionTrigger = triggerData.functionTrigger?.target;
  invariant(functionTrigger);
  functionTrigger.function = Ref.make(graph.root);
  functionTrigger.inputNodeId = computeNode.id;
};

const deleteTriggerObjects = (computeGraph: ComputeGraphModel, deleted: CanvasGraphModel) => {
  const space = getSpace(computeGraph.root);
  if (!space) {
    return;
  }
  for (const node of deleted.nodes) {
    if (node.type === 'trigger') {
      const trigger = node as TriggerShape;
      space.db.remove(trigger.functionTrigger!.target!);
    }
  }
};
