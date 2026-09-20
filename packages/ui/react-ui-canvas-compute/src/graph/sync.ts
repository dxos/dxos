//
// Copyright 2026 DXOS.org
//

//
// Mirrors canvas edits into the compute graph, shared by the editor's `GraphMonitor` and the scene
// engine's compute projection so both surfaces keep one compute node per shape and one edge per link.
//

import { type ComputeEdge, ComputeGraphModel, type ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { isNonNullable } from '@dxos/util';

import { type ComputeShape, type TriggerShape } from '../shapes/index.ts';
import { createComputeNode, isValidComputeNode } from './node-defs.ts';

/** A compute node for the shape, added to the model; the shape's `node` is what it returns. */
export const syncCreate = (model: ComputeGraphModel, shape: ComputeShape): ComputeNode | undefined => {
  invariant(shape.type);
  if (!isValidComputeNode(shape.type)) {
    return undefined;
  }
  const computeNode = createComputeNode(shape);
  if (shape.type === 'trigger') {
    linkTriggerToCompute(model, computeNode, shape as TriggerShape);
  }
  model.addNode(computeNode);
  return computeNode;
};

export type ComputeLink = {
  /** Compute node ids. */
  source: string;
  target: string;
  output?: string;
  input?: string;
};

/** The compute edge for a link between two compute nodes. */
export const syncLink = (
  model: ComputeGraphModel,
  { source, target, output = DEFAULT_OUTPUT, input = DEFAULT_INPUT }: ComputeLink,
): ComputeEdge => {
  const edge: ComputeEdge = { id: Obj.ID.random(), source, target, output, input };
  model.addEdge(edge);
  return edge;
};

/** Removes the compute nodes and the compute edges that mirror the deleted shapes and links. */
export const syncDelete = (model: ComputeGraphModel, nodeIds: string[], links: ComputeLink[]): void => {
  const edgeIds = links
    .map(
      ({ source, target, output = DEFAULT_OUTPUT, input = DEFAULT_INPUT }) =>
        model.edges.find(
          (edge) => edge.source === source && edge.target === target && edge.output === output && edge.input === input,
        )?.id,
    )
    .filter(isNonNullable);
  model.removeNodes(nodeIds);
  model.removeEdges(edgeIds);
};

const linkTriggerToCompute = (graph: ComputeGraphModel, computeNode: ComputeNode, triggerData: TriggerShape) => {
  const functionTrigger = triggerData.functionTrigger?.target;
  invariant(functionTrigger);
  Obj.update(functionTrigger, (functionTrigger) => {
    // TODO(wittjosiah): Widen Runnable union to include ComputeGraph and remove cast.
    functionTrigger.runnable = Ref.make(graph.root) as any;
    functionTrigger.inputNodeId = computeNode.id;
  });
};

/** A deleted trigger shape takes its function trigger object with it. */
export const deleteTriggerObjects = (computeGraph: ComputeGraphModel, shapes: ComputeShape[]) => {
  const db = Obj.getDatabase(computeGraph.root);
  if (!db) {
    return;
  }
  for (const shape of shapes) {
    if (shape.type === 'trigger') {
      const trigger = shape as TriggerShape;
      if (trigger.functionTrigger?.target) {
        db.remove(trigger.functionTrigger.target);
      }
    }
  }
};
