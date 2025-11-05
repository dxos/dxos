//
// Copyright 2025 DXOS.org
//

import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Array from 'effect/Array';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { GenericToolkit, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
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
  FunctionRegistryService,
  StaticFunctionsProvider,
  FunctionDefinition,
} from '@dxos/functions';
import { TriggerStateStore } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PropertiesType } from '@dxos/react-client/echo';
import { Rx, Registry } from '@effect-rx/rx';

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
    await Promise.all(Array.fromIterable(this.#runtimes.values()).map((rt) => rt.dispose()));
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

        // TODO(dmaretskyi): Make these reactive.
        const toolkits = this.#context.getCapabilities(Capabilities.Toolkit);
        const allFunctions = this.#context.getCapabilities(Capabilities.Functions).flat();

        const mergedToolkit = GenericToolkit.merge(...toolkits);
        const toolkit = mergedToolkit.toolkit;
        const toolkitLayer = mergedToolkit.layer;

        const space = client.spaces.get(spaceId);
        invariant(space);
        yield* Effect.promise(() => space.waitUntilReady());

        return Layer.mergeAll(TriggerDispatcher.layer({ timeControl: 'natural' })).pipe(
          Layer.provideMerge(
            Layer.mergeAll(
              InvocationTracerLive,
              TriggerStateStore.layerKv.pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage)),
              makeToolResolverFromFunctions(allFunctions, toolkit),
              makeToolExecutionServiceFromFunctions(toolkit, toolkitLayer),
              FunctionRegistryService.layer,
            ),
          ),
          Layer.provideMerge(
            Layer.mergeAll(
              FunctionInvocationService.layer.pipe(
                Layer.provideMerge(
                  LocalFunctionExecutionService.layerLive.pipe(
                    Layer.provideMerge(FunctionImplementationResolver.layer),
                    Layer.provideMerge(
                      StaticFunctionsProvider.toLayer({
                        functions: this.#context.capabilities(Capabilities.Functions).pipe(Rx.map(Array.flatten)),
                      }),
                    ),
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
                    Layer.provideMerge(
                      Layer.succeed(Registry.RxRegistry, this.#context.getCapability(Capabilities.RxRegistry)),
                    ),
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
    const objects = yield* DatabaseService.query(Query.type(PropertiesType)).run;
    const [properties] = objects;
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
