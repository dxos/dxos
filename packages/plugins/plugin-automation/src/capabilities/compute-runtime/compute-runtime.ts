//
// Copyright 2025 DXOS.org
//

import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { Capabilities, Capability, type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { GenericToolkit, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { SpaceProperties } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { Database, Obj, Query, Ref } from '@dxos/echo';
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
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { AutomationCapabilities } from '../../types';

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

        // TODO(dmaretskyi): Make these reactive.
        const functions = this.#capabilities.getAll(AppCapabilities.Functions).flat();
        const toolkits = this.#capabilities.getAll(AppCapabilities.Toolkit);
        const mergedToolkit = GenericToolkit.merge(...toolkits);
        const toolkit = mergedToolkit.toolkit;
        const toolkitLayer = mergedToolkit.layer;

        const registry = this.#capabilities.get(Capabilities.AtomRegistry);

        const space = client.spaces.get(spaceId);
        invariant(space, `Invalid space: ${spaceId}`);
        yield* Effect.promise(() => space.waitUntilReady());

        return Layer.mergeAll(TriggerDispatcher.layer({ timeControl: 'natural' })).pipe(
          Layer.provideMerge(Layer.succeed(Registry.AtomRegistry, registry)),
          Layer.provideMerge(
            Layer.mergeAll(
              TracingServiceLive,
              TriggerStateStore.layerKv.pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage)),
              makeToolResolverFromFunctions(functions, toolkit),
              makeToolExecutionServiceFromFunctions(toolkit, toolkitLayer),
            ),
          ),
          Layer.provideMerge(
            FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
              Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions })),
              Layer.provideMerge(
                RemoteFunctionExecutionService.fromClient(
                  client,
                  // If agent is not enabled do not provide spaceId because space context will be unavailable on EDGE.
                  client.config.get('runtime.client.edgeFeatures.agents') ? spaceId : undefined,
                ),
              ),
              Layer.provideMerge(aiServiceLayer),
              Layer.provideMerge(CredentialsService.layerFromDatabase()),
              Layer.provideMerge(space ? Database.layer(space.db) : Database.notAvailable),
              Layer.provideMerge(space ? QueueService.layer(space.queues) : QueueService.notAvailable),
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
      Obj.change(properties, (m) => {
        m.invocationTraceQueue = Ref.fromDXN(queue.dxn);
      });
    }

    const queue = properties.invocationTraceQueue.target;
    invariant(queue);
    return TracingServiceExt.layerInvocationsQueue({ invocationTraceQueue: queue });
  }),
);
