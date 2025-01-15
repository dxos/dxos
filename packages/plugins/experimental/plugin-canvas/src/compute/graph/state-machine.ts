//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';

import { type LLMModel, type MessageImageContentBlock } from '@dxos/assistant';
import { Event, synchronized } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import {
  type ComputeEdge,
  type ComputeEvent,
  type ComputeGraphModel,
  type ComputeGraphNode,
  type ComputeMeta,
  type ComputeNode,
  GraphExecutor,
  makeValueBag,
  unwrapValueBag,
} from '@dxos/conductor';
import { testServices } from '@dxos/conductor/testing';
import { Resource } from '@dxos/context';
import { type GraphEdge, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';

import { resolveComputeNode } from './node-defs';
import type { GptInput, GptOutput } from './types';

// TODO(burdon): API package for conductor.
export const InvalidStateError = Error;

export type FunctionCallback<INPUT, OUTPUT> = (input: INPUT) => Promise<OUTPUT>;

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
  // TODO(burdon): Proxy?
  private readonly _executor = new GraphExecutor({
    computeNodeResolver: (node) => resolveComputeNode(node),
  });

  /**
   * Canvas force-sets outputs of those nodes.
   */
  private _forcedOutputs: Record<string, Record<string, unknown>> = {};

  /**
   * Runtime state of the execution graph.
   */
  private _runtimeState: Record<string, Record<string, RuntimeValue>> = {};

  // TODO(burdon): Remove? Make state reactive?
  public readonly update = new Event();

  /** Computed result. */
  public readonly output = new Event<Extract<ComputeEvent, { type: 'compute-output' }>>();

  constructor(
    /** Persistent compute graph. */
    private readonly _graph: ComputeGraphModel,
  ) {
    super();
  }

  toJSON() {
    return {
      graph: this._graph,
      state: this._runtimeState,
    };
  }

  get graph() {
    return this._graph;
  }

  get userState() {
    return this._forcedOutputs;
  }

  get executedState() {
    return this._runtimeState;
  }

  addNode(node: GraphNode<ComputeNode>) {
    this._graph.addNode(node);
  }

  addEdge(edge: GraphEdge<ComputeEdge>) {
    this._graph.addEdge(edge);
  }

  getComputeNode(nodeId: string): ComputeGraphNode {
    ret
  }

  getInputs(nodeId: string) {
    console.log({ st: this._runtimeState }, nodeId);
    return this._runtimeState[nodeId] ?? {};
  }

  
  getOutputs(nodeId: string) {
    return {};
  }
  
  @log.method()
  setOutput(nodeId: string, property: string, value: any) {
    this._forcedOutputs[nodeId] ??= {};
    this._forcedOutputs[nodeId][property] = value;

    queueMicrotask(async () => {
      try {
        await this.exec();
      } catch (err) {
        log.catch(err);
      }
    });
  }

  async getMeta(node: ComputeNode): Promise<ComputeMeta> {
    const { meta } = await resolveComputeNode(node);
    return meta;
  }

  @synchronized
  async exec() {
    this._runtimeState = {};
    const executor = this._executor.clone();
    await executor.load(this._graph);

    for (const [nodeId, outputs] of Object.entries(this._forcedOutputs)) {
      executor.setOutputs(nodeId, makeValueBag(outputs));
    }

    // TODO(dmaretskyi): Stop hardcoding.
    const allSwitches = this._graph.nodes.filter((node) => node.data.type === 'switch');
    const allAffectedNodes = [...new Set(allSwitches.flatMap((node) => executor.getAllDependantNodes(node.id)))];

    // TODO(burdon): Return map?
    const tasks: Promise<unknown>[] = [];
    for (const node of allAffectedNodes) {
      // TODO(dmaretskyi): Check if the node has a compute function and run computeOutputs if it does.
      const effect = executor.computeInputs(node).pipe(
        Effect.withSpan('runGraph'),
        Effect.provide(
          testServices({
            logger: {
              log: (event) => {
                log('log', { event });
                switch (event.type) {
                  case 'compute-input':
                    this._runtimeState[event.nodeId] ??= {};
                    this._runtimeState[event.nodeId][event.property] = { type: 'executed', value: event.value };
                    break;

                  case 'compute-output':
                    // TODO(burdon): Only fire if changed?
                    this.output.emit(event);
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

      tasks.push(Effect.runPromise(effect));
    }

    await Promise.all(tasks);
    this.update.emit();
  }
}
