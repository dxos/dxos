//
// Copyright 2025 DXOS.org
//

import { Toolkit } from '@effect/ai';
import { BrowserKeyValueStore } from '@effect/platform-browser';
import { Effect, Layer, ManagedRuntime } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Resource } from '@dxos/context';
import { Query, Ref } from '@dxos/echo';
import {
  CredentialsService,
  DatabaseService,
  FunctionImplementationResolver,
  FunctionInvocationService,
  InvocationTracer,
  LocalFunctionExecutionService,
  QueueService,
  RemoteFunctionExecutionService,
  TriggerDispatcher,
} from '@dxos/functions';
import { TriggerStateStore } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PropertiesType } from '@dxos/react-client/echo';

import { AutomationCapabilities } from './capabilities';

export default async (context: PluginContext) => {
  const provider = await new ComputeRuntimeProviderImpl(context).open();
  return contributes(AutomationCapabilities.ComputeRuntime, provider, async () => {
    await provider.close();
  });
};

class ComputeRuntimeProviderImpl extends Resource implements AutomationCapabilities.ComputeRuntimeProvider {
  readonly #runtimes = new Map<SpaceId, AutomationCapabilities.ComputeRuntime>();
  readonly #context: PluginContext;

  constructor(context: PluginContext) {
    super();
    this.#context = context;
  }

  protected override async _open() {}

  protected override async _close() {
    await Promise.all(Array.from(this.#runtimes.values()).map((rt) => rt.dispose()));
    this.#runtimes.clear();
  }

  getRuntime(spaceId: SpaceId): AutomationCapabilities.ComputeRuntime {
    if (this.#runtimes.has(spaceId)) {
      return this.#runtimes.get(spaceId)!;
    }

    const layer = Layer.unwrapEffect(
      Effect.gen(this, function* () {
        const client = this.#context.getCapability(ClientCapabilities.Client);
        const serviceLayer =
          this.#context.getCapability(Capabilities.AiServiceLayer) ?? Layer.die('AiService not found');

        // TODO(dmaretskyi): Make those reactive.
        const functions = this.#context.getCapabilities(Capabilities.Functions);
        const toolkits = this.#context.getCapabilities(Capabilities.Toolkit);
        const handlers = this.#context.getCapabilities(Capabilities.ToolkitHandler);

        const allFunctions = functions.flat();
        // TODO(wittjosiah): Don't cast.
        const toolkit = Toolkit.merge(...toolkits) as Toolkit.Toolkit<any>;
        const handlersLayer = Layer.mergeAll(Layer.empty, ...handlers);

        const space = client.spaces.get(spaceId);
        invariant(space);
        yield* Effect.promise(() => space.waitUntilReady());

        return Layer.mergeAll(TriggerDispatcher.layer({ timeControl: 'natural' })).pipe(
          Layer.provideMerge(
            Layer.mergeAll(
              InvocationTracerLive,
              TriggerStateStore.layerKv.pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage)),
              makeToolResolverFromFunctions(allFunctions, toolkit),
              makeToolExecutionServiceFromFunctions(toolkit, handlersLayer),
            ),
          ),
          Layer.provideMerge(
            Layer.mergeAll(
              FunctionInvocationService.layer.pipe(
                Layer.provideMerge(
                  LocalFunctionExecutionService.layerLive.pipe(
                    Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: allFunctions })),
                    Layer.provideMerge(
                      RemoteFunctionExecutionService.fromClient(
                        client.edge.baseUrl,
                        // If agent is not enabled do not provide spaceId because space context will be unavailable on EDGE.
                        client.config.get('runtime.client.edgeFeatures.agents') ? spaceId : undefined,
                      ),
                    ),
                    Layer.provideMerge(serviceLayer),
                    Layer.provideMerge(CredentialsService.layerFromDatabase()),
                    Layer.provideMerge(space ? DatabaseService.layer(space.db) : DatabaseService.notAvailable),
                    Layer.provideMerge(space ? QueueService.layer(space.queues) : QueueService.notAvailable),
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );

    const runtime = ManagedRuntime.make(layer);
    this.#runtimes.set(spaceId, runtime);

    return runtime;
  }
}

const InvocationTracerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const {
      objects: [properties],
    } = yield* DatabaseService.runQuery(Query.type(PropertiesType));
    invariant(properties);
    if (!properties.invocationTraceQueue) {
      const queue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
      properties.invocationTraceQueue = Ref.fromDXN(queue.dxn);
    }
    const queue = properties.invocationTraceQueue.target;
    invariant(queue);
    return InvocationTracer.layerLive({ invocationTraceQueue: queue });
  }),
);
