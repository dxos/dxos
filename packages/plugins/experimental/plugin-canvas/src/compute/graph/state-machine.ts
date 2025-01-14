//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';

import { type LLMModel, type MessageImageContentBlock } from '@dxos/assistant';
import { Event, synchronized } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { type ComputeEdge, GraphExecutor, Model, makeValueBag, unwrapValueBag } from '@dxos/conductor';
import { testServices } from '@dxos/conductor/testing';
import { Resource } from '@dxos/context';
import { type ObjectId } from '@dxos/echo-schema';
import { type GraphEdge, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { resolveComputeNode } from './node-defs';
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

  // TODO(burdon): Remove.
  gpt?: GptExecutor;
  model?: LLMModel;
};

export type RuntimeValue =
  | {
      type: 'not-executed'; // TODO(burdon): Different from pending?
    }
  | {
      type: 'executed';
      value: any;
    }
  | {
      type: 'pending';
    }
  | {
      type: 'error';
      error: string;
    };

/**
 * Client proxy to the state machine.
 */
// TODO(burdon): Rename ComputeProxy?
export class StateMachine extends Resource {
  public readonly update = new Event();

  /** Computed result. */
  public readonly output = new Event<{ nodeId: ObjectId; property: string }>();

  /** Persistent compute graph. */
  private readonly _graph = Model.ComputeGraphModel.create();

  // TODO(burdon): Proxy?
  private readonly _executor = new GraphExecutor({
    computeNodeResolver: (node) => resolveComputeNode(node),
  });

  // TODO(burdon): Document.
  private readonly _forcedOutputs = new ComplexMap<[nodeId: ObjectId, property: string], any>(
    ([nodeId, property]) => `${nodeId}/${property}`,
  );

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
        await this.exec();
      } catch (error) {
        console.error('Error computing graph', error);
      }
    });
  }

  @synchronized
  async exec() {
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
                log.info('log', { event });
                switch (event.type) {
                  case 'compute-input':
                    this._runtimeState[event.nodeId] ??= {};
                    this._runtimeState[event.nodeId][event.property] = { type: 'executed', value: event.value };
                    break;

                  case 'compute-output':
                    // event.nodeId event.property
                    this.output.emit({ nodeId: event.nodeId, property: event.property });
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
}
