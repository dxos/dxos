//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Effect, Layer, ManagedRuntime } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Resource } from '@dxos/context';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionImplementationResolver,
  InvocationTracer,
  LocalFunctionExecutionService,
  QueueService,
  RemoteFunctionExecutionService,
  TracingService,
  TriggerDispatcher,
} from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AssistantCapabilities } from './capabilities';

export default async (context: PluginContext) => {
  const provider = await new ComputeRuntimeProviderImpl(context).open();
  return contributes(AssistantCapabilities.ComputeRuntime, provider, async () => {
    await provider.close();
  });
};

class ComputeRuntimeProviderImpl extends Resource implements AssistantCapabilities.ComputeRuntimeProvider {
  readonly #runtimes = new Map<SpaceId, ManagedRuntime.ManagedRuntime<AssistantCapabilities.ComputeServices, never>>();
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

  getRuntime(spaceId: SpaceId): ManagedRuntime.ManagedRuntime<AssistantCapabilities.ComputeServices, never> {
    if (this.#runtimes.has(spaceId)) {
      return this.#runtimes.get(spaceId)!;
    }

    const layer = Layer.unwrapEffect(
      Effect.gen(this, function* () {
        const client = this.#context.getCapability(ClientCapabilities.Client);
        const serviceLayer =
          this.#context.getCapability(AssistantCapabilities.AiServiceLayer) ?? Layer.die('AiService not found');

        // TODO(dmaretskyi): Make those reactive.
        const functions = this.#context.getCapabilities(Capabilities.Functions);
        const toolkits = this.#context.getCapabilities(Capabilities.Toolkit);
        const handlers = this.#context.getCapabilities(Capabilities.ToolkitHandler);

        const allFunctions = functions.flat();
        // TODO(wittjosiah): Don't cast.
        const toolkit = AiToolkit.merge(...toolkits) as AiToolkit.Any as AiToolkit.AiToolkit<AiTool.Any>;
        const handlersLayer = Layer.mergeAll(Layer.empty, ...handlers);

        const space = client.spaces.get(spaceId);
        invariant(space);
        yield* Effect.promise(() => space.waitUntilReady());

        return Layer.mergeAll(TriggerDispatcher.layer({ timeControl: 'natural' })).pipe(
          Layer.provideMerge(
            Layer.mergeAll(
              InvocationTracer.layerLive,
              serviceLayer,
              makeToolResolverFromFunctions(allFunctions, toolkit),
              makeToolExecutionServiceFromFunctions(allFunctions, toolkit, handlersLayer),
              CredentialsService.layerFromDatabase(),
              ComputeEventLogger.layerFromTracing,
            ),
          ),
          Layer.provideMerge(
            Layer.mergeAll(
              space ? DatabaseService.layer(space.db) : DatabaseService.notAvailable,
              space ? QueueService.layer(space.queues) : QueueService.notAvailable,
              TracingService.layerNoop,
              LocalFunctionExecutionService.layerLive,
              RemoteFunctionExecutionService.mockLayer,
            ),
          ),
          Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: allFunctions })),
        );
      }),
    );

    const runtime = ManagedRuntime.make(layer);
    this.#runtimes.set(spaceId, runtime);

    return runtime;
  }
}
