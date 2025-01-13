//
// Copyright 2024 DXOS.org
//

import { type LLMModel, type MessageImageContentBlock } from '@dxos/assistant';
import { Event, synchronized } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import {
  ComputeEdge,
  type ComputeImplementation,
  ComputeNode,
  defineComputeNode,
  GraphExecutor,
  makeValueBag,
  Model,
  synchronizedComputeFunction,
  unwrapValueBag,
} from '@dxos/conductor';
import { testServices } from '@dxos/conductor/testing';
import { Resource } from '@dxos/context';
import { type ObjectId, S } from '@dxos/echo-schema';
import { type GraphEdge, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';
import { Effect } from 'effect';
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './compute-node';
import type { FunctionCallback, GptInput, GptOutput } from './nodes';

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

export type RuntimeValue =
  | {
      type: 'executed';
      value: any;
    }
  | {
      type: 'error';
      error: string;
    }
  | {
      type: 'pending';
    }
  | {
      type: 'not-executed';
    };

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
export class StateMachine extends Resource {
  public readonly update = new Event();
  public readonly outputComputed = new Event<{ nodeId: ObjectId; property: string }>();

  private readonly _graph = Model.ComputeGraphModel.create();

  private readonly _forcedOutputs = new ComplexMap<[nodeId: ObjectId, property: string], any>(
    ([nodeId, property]) => `${nodeId}/${property}`,
  );

  private readonly _executor = new GraphExecutor({
    computeNodeResolver: this._resolveComputeNode.bind(this),
  });

  private _runtimeState: Record<string, Record<string, RuntimeValue>> = {};

  get graph() {
    return this._graph;
  }

  get userState() {
    return Object.fromEntries(
      [...this._forcedOutputs.entries()].map(([[node, property], value]) => [`${node}/${property}`, value]),
    );
  }

  get executedState() {
    return this._runtimeState;
  }

  addNode(node: GraphNode<Model.ComputeGraphNode>) {
    this._graph.model.addNode(node);
  }

  addEdge(edge: GraphEdge<ComputeEdge>) {
    this._graph.model.addEdge(edge);
  }

  getInputs(nodeId: string) {
    return this._runtimeState[nodeId] ?? {};
  }

  getOutputs(nodeId: string) {
    return {};
  }

  @log.method()
  setOutput(nodeId: string, property: string, value: any) {
    this._forcedOutputs.set([nodeId, property], value);
    queueMicrotask(async () => {
      try {
        await this.compute();
      } catch (error) {
        console.error('Error computing graph', error);
      }
    });
  }

  @synchronized
  async compute() {
    this._runtimeState = {};
    const executor = this._executor.clone();
    await executor.load(this._graph.model as any);

    const outputsByNode: Record<string, Record<string, any>> = {};
    for (const [[nodeId, property], value] of this._forcedOutputs.entries()) {
      outputsByNode[nodeId] ??= {};
      outputsByNode[nodeId][property] = value;
    }
    for (const [nodeId, outputs] of Object.entries(outputsByNode)) {
      executor.setOutputs(nodeId, makeValueBag(outputs));
    }

    // TODO(dmaretskyi): Stop hardcoding.
    const allSwitches = this._graph.model.filterNodes().filter((node) => node.data.type === 'switch');
    const allAffectedNodes = [...new Set(allSwitches.flatMap((node) => executor.getAllDependantNodes(node.id)))];

    const tasks: Promise<unknown>[] = [];
    for (const node of allAffectedNodes) {
      // TODO(dmaretskyi): Check if the node has a compute function and run computeOutputs if it does.
      const eff = executor.computeInputs(node).pipe(
        Effect.withSpan('runGraph'),
        Effect.provide(
          testServices({
            logger: {
              log: (event) => {
                console.log('log', event);
                switch (event.type) {
                  case 'compute-input':
                    this._runtimeState[event.nodeId] ??= {};
                    this._runtimeState[event.nodeId][event.property] = { type: 'executed', value: event.value };
                    break;
                  case 'compute-output':
                    // event.nodeId event.property
                    this.outputComputed.emit({ nodeId: event.nodeId, property: event.property });
                    break;
                }
              },
              nodeId: undefined,
            },
          }),
        ),
        Effect.scoped,
        Effect.flatMap(unwrapValueBag),
        Effect.withSpan('test'),
      );
      tasks.push(Effect.runPromise(eff));
    }
    await Promise.all(tasks);
    this.update.emit();
  }

  private async _resolveComputeNode(node: ComputeNode): Promise<ComputeImplementation> {
    console.log('resolveComputeNode', node.type);
    if (nodes[node.type]) {
      return nodes[node.type];
    }
    throw new Error(`Unknown node type: ${node.type}`);
  }
}

const nodes: Record<string, ComputeImplementation> = {
  switch: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),
  and: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    compute: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a && b })),
  }),
  or: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    compute: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a || b })),
  }),
  not: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    compute: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: !input })),
  }),
  beacon: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({}),
  }),
};
