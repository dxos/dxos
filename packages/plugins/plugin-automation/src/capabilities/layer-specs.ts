//
// Copyright 2026 DXOS.org
//

import { Registry as AtomRegistry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ClientService } from '@dxos/client';
import { LayerSpec, OperationHandlerSet, OperationRegistry } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Registry } from '@dxos/echo';
import {
  FeedTraceSink,
  RemoteFunctionExecutionService,
  TriggerDispatcher,
  TriggerStateStore,
} from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';

//
// Capability Module
//
// Contributes application- and space-affinity `Capabilities.LayerSpec` entries
// that together replace the former monolithic `AutomationCapabilities.ComputeRuntime`.
//
// Specs are declared at module level; runtime state (the `Client`, contributed
// capability lists, etc.) is resolved via Effect-level requirements rather
// than captured from an outer scope.
//

/**
 * Gathers contributed {@link Capabilities.OperationHandler} sets from the
 * {@link Capability.Service} and exposes them through the
 * {@link OperationHandlerSet.OperationHandlerProvider} tag so space-affinity
 * specs (e.g. {@link OperationRegistrySpec}) can consume them through the
 * normal LayerStack resolution path.
 */
const OperationHandlerProviderSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service],
    provides: [OperationHandlerSet.OperationHandlerProvider],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const operationHandlerSets = yield* Capability.getAll(Capabilities.OperationHandler);
        const mergedOperationHandlers =
          operationHandlerSets.length === 0
            ? OperationHandlerSet.empty
            : OperationHandlerSet.merge(...operationHandlerSets);
        return OperationHandlerSet.provide(mergedOperationHandlers);
      }),
    ),
);

const RegistrySpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService],
    provides: [Registry.Service],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const client = yield* ClientService;
        return Layer.succeed(Registry.Service, client.graph.registry);
      }),
    ),
);

const OpaqueToolkitSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service],
    provides: [OpaqueToolkit.OpaqueToolkitProvider],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const capabilities = yield* Capability.Service;
        return Layer.succeed(OpaqueToolkit.OpaqueToolkitProvider, {
          getToolkit: () => {
            const toolkits = capabilities.getAll(AppCapabilities.Toolkit);
            return OpaqueToolkit.merge(...toolkits);
          },
        });
      }),
    ),
);

const OperationRegistrySpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Database.Service, OperationHandlerSet.OperationHandlerProvider],
    provides: [OperationRegistry.Service],
  },
  () => OperationRegistry.layer,
);

/**
 * In-memory trigger state. Loses state across restarts but works in both
 * browser and CLI/Node contexts. Hosts that need durable storage should
 * contribute a replacement LayerSpec that provides {@link TriggerStateStore}
 * backed by a persistent `KeyValueStore` (e.g. `BrowserKeyValueStore` or
 * `BunKeyValueStore`).
 */
const TriggerStateStoreSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [],
    provides: [TriggerStateStore],
  },
  () => TriggerStateStore.layerMemory,
);

//
// Space-affinity specs.
//

const FeedTraceSinkSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Database.Service, Feed.FeedService],
    provides: [FeedTraceSink.FeedTraceSink],
  },
  () => FeedTraceSink.layerLive,
);

/**
 * Space-scoped `RemoteFunctionExecutionService`. When edge agents are enabled
 * (`runtime.client.edgeFeatures.agents`) functions are invoked without a space
 * binding (the edge routes them); otherwise they are scoped to the space. The
 * config is read inside the factory — at slice-materialisation time, once
 * `ClientService` is available — so the owning module does not need the client
 * at activation time and can activate on `SetupProcessManager`.
 */
const RemoteFunctionExecutionSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService],
    provides: [RemoteFunctionExecutionService],
  },
  (context) =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for RemoteFunctionExecutionService');
        const client = yield* ClientService;
        const edgeAgents = client.config.get('runtime.client.edgeFeatures.agents');
        return RemoteFunctionExecutionService.fromClient(client, edgeAgents ? undefined : context.space);
      }),
    ),
);

const TriggerDispatcherSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [
      Database.Service,
      Feed.FeedService,
      TriggerStateStore,
      ProcessManager.ProcessManagerService,
      AtomRegistry.AtomRegistry,
    ],
    provides: [TriggerDispatcher],
  },
  () => TriggerDispatcher.layer({ timeControl: 'natural' }),
);

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(Capabilities.LayerSpec, OperationHandlerProviderSpec),
    Capability.contributes(Capabilities.LayerSpec, RegistrySpec),
    Capability.contributes(Capabilities.LayerSpec, OpaqueToolkitSpec),
    Capability.contributes(Capabilities.LayerSpec, OperationRegistrySpec),
    Capability.contributes(Capabilities.LayerSpec, TriggerStateStoreSpec),
    Capability.contributes(Capabilities.LayerSpec, FeedTraceSinkSpec),
    Capability.contributes(Capabilities.LayerSpec, TriggerDispatcherSpec),
    Capability.contributes(Capabilities.LayerSpec, RemoteFunctionExecutionSpec),
    Capability.contributes(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver })),
  ]),
);
