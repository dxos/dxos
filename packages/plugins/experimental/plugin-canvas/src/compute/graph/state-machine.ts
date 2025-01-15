//
// Copyright 2024 DXOS.org
//

import { Effect, Exit } from 'effect';

import { type LLMModel, type MessageImageContentBlock } from '@dxos/assistant';
import { Event, synchronized } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import {
  type ComputeEdge,
  type ComputeEvent,
  type ComputeGraphModel,
  type ComputeMeta,
  type ComputeNode,
  type ComputeRequirements,
  EventLogger,
  GptService,
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
import { Context, Layer, Scope } from 'effect';
import { MockGpt } from '@dxos/conductor';

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

export type Services = {
  gpt: Context.Tag.Service<GptService>;
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

  private _services: Partial<Services> = {};

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

  public readonly events = new Event<ComputeEvent>();

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

  setServices(services: Partial<Services>) {
    Object.assign(this._services, services);
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

  getComputeNode(nodeId: string): GraphNode<ComputeNode> {
    return this._graph.getNode(nodeId);
  }

  getInputs(nodeId: string) {
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
    console.log('begin execution');
    this._runtimeState = {};
    const executor = this._executor.clone();
    await executor.load(this._graph);

    for (const [nodeId, outputs] of Object.entries(this._forcedOutputs)) {
      executor.setOutputs(nodeId, makeValueBag(outputs));
    }

    // TODO(dmaretskyi): Stop hardcoding.
    const allSwitches = this._graph.nodes.filter((node) => node.data.type === 'switch' || node.data.type === 'chat');
    const allAffectedNodes = [...new Set(allSwitches.flatMap((node) => executor.getAllDependantNodes(node.id)))];

    const services = this._createServiceLayer();
    await Effect.runPromise(
      Effect.gen(this, function* () {
        const scope = yield* Scope.make();

        // TODO(burdon): Return map?
        const tasks: Effect.Effect<unknown, any, never>[] = [];
        for (const node of allAffectedNodes) {
          console.log('will compute inputs', node);
          // TODO(dmaretskyi): Check if the node has a compute function and run computeOutputs if it does.
          const effect = executor.computeInputs(node).pipe(
            Effect.withSpan('runGraph'),
            Effect.provide(services),
            Scope.extend(scope),

            Effect.flatMap(unwrapValueBag),
            Effect.withSpan('test'),
          );

          tasks.push(effect);
        }

        yield* Effect.all(tasks);

        yield* Scope.close(scope, Exit.void);
      }),
    );
    console.log('done executing');

    this.update.emit();
  }

  private _createLogger(): Context.Tag.Service<EventLogger> {
    return {
      log: (event) => {
        log.info('log', { event });
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
        this.events.emit(event);
      },
      nodeId: undefined, // Not in a context of a specific node.
    };
  }

  private _createServiceLayer(): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> {
    const services = { ...DEFAULT_SERVICES, ...this._services };
    const logLayer = Layer.succeed(EventLogger, this._createLogger());
    const gptLayer = Layer.succeed(GptService, services.gpt!);
    return Layer.mergeAll(logLayer, gptLayer);
  }
}

const DEFAULT_SERVICES: Services = {
  gpt: new MockGpt(),
};
