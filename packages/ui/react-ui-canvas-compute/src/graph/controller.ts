//
// Copyright 2024 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { type Context, Effect, Either, Exit, Layer, Scope } from 'effect';

import { type ImageContentBlock } from '@dxos/ai';
import { Event, synchronized } from '@dxos/async';
import {
  isNotExecuted,
  makeValueBag,
  type ComputeEdge,
  type ComputeEvent,
  type ComputeGraphModel,
  type ComputeMeta,
  type ComputeNode,
  type ComputeRequirements,
  EventLogger,
  type GptInput,
  type GptOutput,
  GptService,
  GraphExecutor,
  MockGpt,
  QueueService,
  SpaceService,
  type ValueBag,
  type GraphDiagnostic,
  FunctionCallService,
} from '@dxos/conductor';
import { Resource } from '@dxos/context';
import type { EdgeClient, EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { type CanvasGraphModel } from '@dxos/react-ui-canvas-editor';

import { resolveComputeNode } from './node-defs';
import { createComputeGraph } from '../hooks';
import { type ComputeShape } from '../shapes';

// TODO(burdon): API package for conductor.
export const InvalidStateError = Error;

export type FunctionCallback<INPUT, OUTPUT> = (input: INPUT) => Promise<OUTPUT>;

/**
 * Callback to notify the controller of a scheduled update.
 */
export type AsyncUpdate<T> = (value: T) => void;

export interface GptExecutor {
  invoke: FunctionCallback<GptInput, GptOutput>;

  // TODO(dmaretskyi): A hack to get image artifacts working. Rework into querying images from the ai-service store.
  imageCache: Map<string, ImageContentBlock>;
}

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
  edgeClient?: EdgeClient;
  edgeHttpClient?: EdgeHttpClient;
  spaceService?: Context.Tag.Service<SpaceService>;
};

type ComputeOutputEvent = {
  nodeId: string;
  property: string;
  value: RuntimeValue;
};

/**
 * Nodes that will automatically trigger the execution of the graph on startup.
 */
const AUTO_TRIGGER_NODES = ['chat', 'switch', 'constant'];

export const createComputeGraphController = (graph: CanvasGraphModel<ComputeShape>, services?: Partial<Services>) => {
  const computeGraph = createComputeGraph(graph);
  const controller = new ComputeGraphController(computeGraph);
  controller.setServices(services ?? {});
  return { controller, graph };
};

/**
 * Controller that manages compute graph state, execution, and service coordination.
 */
export class ComputeGraphController extends Resource {
  private readonly _executor = new GraphExecutor({
    computeNodeResolver: (node) => resolveComputeNode(node),
  });

  private _diagnostics: GraphDiagnostic[] = [];

  private _services: Partial<Services> = {};

  /**
   * Canvas force-sets outputs of those nodes.
   */
  private _forcedOutputs: Record<string, Record<string, unknown>> = {};

  /**
   * Runtime state of the execution graph.
   */
  private _runtimeStateInputs: Record<string, Record<string, RuntimeValue>> = {};

  private _runtimeStateOutputs: Record<string, Record<string, RuntimeValue>> = {};

  // TODO(burdon): Remove? Make state reactive?
  public readonly update = new Event();

  /** Computed result. */
  public readonly output = new Event<ComputeOutputEvent>();

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
      state: {
        inputs: this._runtimeStateInputs,
        outputs: this._runtimeStateOutputs,
      },
      forcedOutputs: this._forcedOutputs,
    };
  }

  setServices(services: Partial<Services>): void {
    log.info('setServices', { services });
    Object.assign(this._services, services);
  }

  get graph() {
    return this._graph;
  }

  get diagnostics() {
    return this._diagnostics;
  }

  get userState() {
    return this._forcedOutputs;
  }

  get inputStates() {
    return this._runtimeStateInputs;
  }

  get outputStates() {
    return this._runtimeStateOutputs;
  }

  /**
   * Inputs and outputs for all nodes.
   */
  get state() {
    const ids = [...new Set([...Object.keys(this._runtimeStateInputs), ...Object.keys(this._runtimeStateOutputs)])];
    return Object.fromEntries(
      ids.map((id) => [
        id,
        {
          node: this._graph.getNode(id),
          input: this._runtimeStateInputs[id],
          output: this._runtimeStateOutputs[id],
        },
      ]),
    );
  }

  addNode(node: ComputeNode): void {
    this._graph.addNode(node);
  }

  addEdge(edge: ComputeEdge): void {
    this._graph.addEdge(edge);
  }

  getComputeNode(nodeId: string): ComputeNode {
    return this._graph.getNode(nodeId);
  }

  getInputs(nodeId: string): Record<string, RuntimeValue> {
    return this._runtimeStateInputs[nodeId] ?? {};
  }

  getOutputs(nodeId: string): Record<string, RuntimeValue> {
    return this._runtimeStateOutputs[nodeId] ?? {};
  }

  setOutput(nodeId: string, property: string, value: any): void {
    this._forcedOutputs[nodeId] ??= {};
    this._forcedOutputs[nodeId][property] = value;

    queueMicrotask(async () => {
      try {
        await this.exec(nodeId);
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
  async checkGraph(): Promise<void> {
    const executor = this._executor.clone();
    await executor.load(this._graph);
    this._diagnostics = executor.getDiagnostics();
  }

  async evalNode(nodeId: string): Promise<void> {
    const executor = this._executor.clone();
    await executor.load(this._graph);

    for (const [nodeId, outputs] of Object.entries(this._forcedOutputs)) {
      executor.setOutputs(nodeId, Effect.succeed(makeValueBag(outputs)));
    }

    const services = this._createServiceLayer();
    await Effect.runPromise(
      Effect.gen(this, function* () {
        const scope = yield* Scope.make();

        // TODO(dmaretskyi): Code duplication.
        const executable = yield* Effect.promise(() => resolveComputeNode(this._graph.getNode(nodeId)));
        const computingOutputs = executable.exec != null;
        // TODO(dmaretskyi): Check if the node has a compute function and run computeOutputs if it does.
        const effect = (computingOutputs ? executor.computeOutputs(nodeId) : executor.computeInputs(nodeId)).pipe(
          Effect.withSpan('runGraph'),
          Scope.extend(scope),

          Effect.flatMap(computeValueBag),
          Effect.provide(services),
          Effect.withSpan('test'),
          Effect.tap((values) => {
            for (const [key, value] of Object.entries(values)) {
              if (computingOutputs) {
                this._onOutputComputed(nodeId, key, value);
              } else {
                this._onInputComputed(nodeId, key, value);
              }
            }
          }),
        );

        yield* effect;

        yield* Scope.close(scope, Exit.void);
      }),
    );

    this.update.emit();
  }

  /**
   * Executes the graph.
   * @param startFromNode - Node to start from, otherwise all {@link AUTO_TRIGGER_NODES} are executed.
   */
  @synchronized
  async exec(startFromNode?: string): Promise<void> {
    this._runtimeStateInputs = {};
    this._runtimeStateOutputs = {};
    const executor = this._executor.clone();
    await executor.load(this._graph);

    for (const [nodeId, outputs] of Object.entries(this._forcedOutputs)) {
      executor.setOutputs(nodeId, Effect.succeed(makeValueBag(outputs)));
    }

    // TODO(dmaretskyi): Stop hardcoding.
    const triggerNodes =
      startFromNode != null
        ? [this._graph.getNode(startFromNode)]
        : this._graph.nodes.filter((node) => node.type != null && AUTO_TRIGGER_NODES.includes(node.type));
    const allAffectedNodes = [...new Set(triggerNodes.flatMap((node) => executor.getAllDependantNodes(node.id)))];

    const services = this._createServiceLayer();
    await Effect.runPromise(
      Effect.gen(this, function* () {
        const scope = yield* Scope.make();

        // TODO(burdon): Return map?
        const tasks: Effect.Effect<unknown, any, never>[] = [];
        for (const node of allAffectedNodes) {
          // TODO(dmaretskyi): Code duplication.
          const executable = yield* Effect.promise(() => resolveComputeNode(this._graph.getNode(node)));
          const computingOutputs = executable.exec != null;

          // TODO(dmaretskyi): Check if the node has a compute function and run computeOutputs if it does.
          const effect = (computingOutputs ? executor.computeOutputs(node) : executor.computeInputs(node)).pipe(
            Effect.withSpan('runGraph'),
            Scope.extend(scope),
            Effect.flatMap(computeValueBag),
            Effect.provide(services),
            Effect.withSpan('test'),
            Effect.tap((values) => {
              for (const [key, value] of Object.entries(values)) {
                if (computingOutputs) {
                  this._onOutputComputed(node, key, value);
                } else {
                  this._onInputComputed(node, key, value);
                }
              }
            }),
          );

          tasks.push(effect);
        }

        //
        yield* Effect.all(tasks);

        //
        yield* Scope.close(scope, Exit.void);
      }),
    );

    this.update.emit();
  }

  private _createServiceLayer(): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> {
    const services = { ...DEFAULT_SERVICES, ...this._services };
    const logLayer = Layer.succeed(EventLogger, this._createLogger());
    const gptLayer = Layer.succeed(GptService, services.gpt!);
    const queueLayer =
      services.edgeHttpClient != null ? QueueService.fromClient(services.edgeHttpClient) : QueueService.notAvailable;

    const spaceLayer =
      services.spaceService != null ? Layer.succeed(SpaceService, services.spaceService) : SpaceService.empty;

    const functionCallServiceLayer =
      services.edgeHttpClient != null && services.spaceService != null
        ? Layer.succeed(
            FunctionCallService,
            FunctionCallService.fromClient(services.edgeHttpClient.baseUrl, services.spaceService.spaceId),
          )
        : Layer.succeed(FunctionCallService, FunctionCallService.mock());

    return Layer.mergeAll(logLayer, gptLayer, queueLayer, spaceLayer, functionCallServiceLayer, FetchHttpClient.layer);
  }

  private _createLogger(): Context.Tag.Service<EventLogger> {
    return {
      log: (event) => {
        this._handleEvent(event);
      },
      nodeId: undefined, // Not in a context of a specific node.
    };
  }

  private _handleEvent(event: ComputeEvent): void {
    log('handleEvent', { event });
    switch (event.type) {
      case 'compute-input': {
        this._onInputComputed(event.nodeId, event.property, { type: 'executed', value: event.value });
        break;
      }

      case 'compute-output': {
        this._onOutputComputed(event.nodeId, event.property, { type: 'executed', value: event.value });
        break;
      }
    }
    this.events.emit(event);
  }

  private _onInputComputed(nodeId: string, property: string, value: RuntimeValue): void {
    this._runtimeStateInputs[nodeId] ??= {};
    this._runtimeStateInputs[nodeId][property] = value;
  }

  private _onOutputComputed(nodeId: string, property: string, value: RuntimeValue): void {
    this._runtimeStateOutputs[nodeId] ??= {};
    this._runtimeStateOutputs[nodeId][property] = value;

    // TODO(burdon): Only fire if changed?
    this.output.emit({ nodeId, property, value });
  }
}

const DEFAULT_SERVICES: Services = {
  gpt: new MockGpt(),
};

/**
 * Waits for all effects in the bag to complete and returns the `RuntimeValue` for each property.
 */
const computeValueBag = (bag: ValueBag<any>): Effect.Effect<Record<string, RuntimeValue>, never, never> => {
  return Effect.all(
    Object.entries(bag.values).map(([key, eff]) =>
      Effect.either(eff).pipe(
        Effect.map((value) => {
          if (Either.isLeft(value)) {
            if (isNotExecuted(value.left)) {
              return [key, { type: 'not-executed' }] as const;
            } else {
              return [key, { type: 'error', error: value.left }] as const;
            }
          } else {
            return [key, { type: 'executed', value: value.right }] as const;
          }
        }),
      ),
    ),
  ).pipe(Effect.map((entries) => Object.fromEntries(entries) as Record<string, RuntimeValue>));
};
