//
// Copyright 2024 DXOS.org
//

import { type LLMModel, type MessageImageContentBlock } from '@dxos/assistant';
import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { type Context, Resource } from '@dxos/context';
import { inspectCustom } from '@dxos/debug';
import { type GraphEdge, type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type ComputeGraph, createComputeGraph } from './compute-graph';
import { type Binding, type ComputeNode } from './compute-node';
import type { FunctionCallback, GptInput, GptOutput } from './nodes';
import { Model, ComputeEdge } from '@dxos/conductor';

export const InvalidStateError = Error;

/**
 * Callback to notify the state machine of a scheduled update.
 */
export type AsyncUpdate<T> = (value: T) => void;

export interface GptExecutor {
  invoke: FunctionCallback<GptInput, GptOutput>;

  // TODO(dmaretskyi): A hack to get image artifacts working. Rework into querying images from the ai-service store.
  imageCache: Map<string, MessageImageContentBlock>;
}

export type StateMachineContext = {
  space?: Space;
  gpt?: GptExecutor;

  // TODO(dmaretskyi): Not used.
  model?: LLMModel; // TODO(burdon): Evolve.
};

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
export class StateMachine extends Resource {
  private readonly _graph = Model.ComputeGraphModel.create();

  get graph() {
    return this._graph;
  }

  addNode(node: GraphNode<Model.ComputeGraphNode>) {
    this._graph.model.addNode(node);
  }

  addEdge(edge: GraphEdge<ComputeEdge>) {
    this._graph.model.addEdge(edge);
  }
}
