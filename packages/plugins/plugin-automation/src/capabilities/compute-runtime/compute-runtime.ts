//
// Copyright 2025 DXOS.org
//

import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { GenericToolkit } from '@dxos/ai';
import { Capabilities, Capability, type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ToolExecutionServices } from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { SpaceProperties } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { CredentialsService, QueueService } from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
  TracingServiceExt,
  TriggerDispatcher,
  TriggerStateStore,
} from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { OperationHandlerSet } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { AutomationCapabilities } from '../../types';
import { Blueprint } from '@dxos/blueprints';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const provider = yield* Effect.tryPromise(() => new ComputeRuntimeProviderImpl(capabilities).open());
    return Capability.contributes(AutomationCapabilities.ComputeRuntime, provider, () =>
      Effect.tryPromise(() => provider.close()),
    );
  }),
);

/**
 * Adapts plugin capabilities to runtime layers.
 */
class ComputeRuntimeProviderImpl extends Resource implements AutomationCapabilities.ComputeRuntimeProvider {
  readonly #runtimes = new Map<SpaceId, AutomationCapabilities.ComputeRuntime>();
  readonly #capabilities: CapabilityManager.CapabilityManager;

  constructor(capabilities: CapabilityManager.CapabilityManager) {
    super();
    this.#capabilities = capabilities;
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
        const client = this.#capabilities.get(ClientCapabilities.Client);
        const aiServiceLayer =
          this.#capabilities.get(AppCapabilities.AiServiceLayer) ?? Layer.die('AiService not found');
        const registry = this.#capabilities.get(Capabilities.AtomRegistry);

        // TODO(dmaretskyi): Make these reactive.
        const operationHandlers = OperationHandlerSet.merge(
          ...this.#capabilities.getAll(Capabilities.OperationHandler),
        );

        const genericToolkitProvider = Layer.succeed(GenericToolkit.Provider, {
          getToolkit: () => {
            const toolkits = this.#capabilities.getAll(AppCapabilities.Toolkit);
            return GenericToolkit.merge(...toolkits);
          },
        });

        const blueprints = this.#capabilities
          .getAll(AppCapabilities.BlueprintDefinition)
          .flatMap((blueprint) => blueprint.make());

        const space = client.spaces.get(spaceId);
        invariant(space, `Invalid space: ${spaceId}`);
        yield* Effect.promise(() => space.waitUntilReady());

        return Layer.mergeAll(
          TriggerDispatcher.layer({ timeControl: 'natural' }),
          // TODO(dmaretskyi): Make blueprints reactive and registry accept an atom.
          Layer.succeed(Blueprint.RegistryService, new Blueprint.Registry(blueprints)),
        ).pipe(
          Layer.provideMerge(Layer.succeed(Capability.Service, this.#capabilities)),
          Layer.provideMerge(Layer.succeed(Registry.AtomRegistry, registry)),
          Layer.provideMerge(
            Layer.mergeAll(
              TracingServiceLive,
              TriggerStateStore.layerKv.pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage)),
              ToolExecutionServices,
            ),
          ),
          Layer.provideMerge(
            FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
              Layer.provideMerge(genericToolkitProvider),
              Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: operationHandlers })),
              Layer.provideMerge(
                RemoteFunctionExecutionService.fromClient(
                  client,
                  // If agent is not enabled do not provide spaceId because space context will be unavailable on EDGE.
                  client.config.get('runtime.client.edgeFeatures.agents') ? spaceId : undefined,
                ),
              ),
              Layer.provideMerge(aiServiceLayer),
              Layer.provideMerge(CredentialsService.layerFromDatabase()),
              Layer.provideMerge(ClientService.fromClient(client)),
              Layer.provideMerge(space ? Database.layer(space.db) : Database.notAvailable),
              Layer.provideMerge(space ? QueueService.layer(space.queues) : QueueService.notAvailable),
              Layer.provideMerge(space ? createFeedServiceLayer(space.queues) : Feed.notAvailable),
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

const TracingServiceLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const objects = yield* Database.runQuery(Query.type(SpaceProperties));
    const [properties] = objects;
    invariant(properties);
    // TODO(burdon): Check ref target has loaded?
    if (!properties.invocationTraceQueue || !properties.invocationTraceQueue.target) {
      const queue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
      Obj.change(properties, (obj) => {
        obj.invocationTraceQueue = Ref.fromDXN(queue.dxn);
      });
    }

    const queue = properties.invocationTraceQueue.target;
    invariant(queue);
    return TracingServiceExt.layerInvocationsQueue({ invocationTraceQueue: queue });
  }),
);
