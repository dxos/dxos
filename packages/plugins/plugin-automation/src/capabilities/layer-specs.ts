//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ClientService } from '@dxos/client';
import { Blueprint, LayerSpec, Operation, OperationHandlerSet, OperationRegistry } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { todo } from '@dxos/debug';
import { Database, Feed } from '@dxos/echo';
import { FunctionInvocationService, QueueService } from '@dxos/functions';
import {
    AgentService, FeedTraceSink,
    FunctionImplementationResolver, RemoteFunctionExecutionService,
    TriggerDispatcher,
    TriggerStateStore
} from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';

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

// TODO(dmaretskyi): Deprecated. Removed from the contribution list because the
// body is `todo()` (never actually provides a working impl) and the declared
// `requires: [Operation.Service, ...]` causes process-slice init to fail with
// `ServiceNotAvailableError` — `Operation.Service` is a per-process builtin,
// not a layer-graph service, so the LayerStack requirements check rejects it.
// Leaving the definition for now in case the deprecation path needs a stub.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _FunctionInvocationSpec_Deprecated = LayerSpec.make(
  {
    affinity: 'process',
    requires: [Operation.Service, OperationRegistry.Service],
    provides: [FunctionInvocationService, FunctionImplementationResolver],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        return todo();
      }),
    ),
);

/**
 * Default application-affinity `RemoteFunctionExecutionService`. Space specs
 * (see {@link RemoteFunctionExecutionOverrideSpec}) can override this with a
 * space-scoped client.
 */
const RemoteFunctionExecutionSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService],
    provides: [RemoteFunctionExecutionService],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const client = yield* ClientService;
        return RemoteFunctionExecutionService.fromClient(client);
      }),
    ),
);

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

const BlueprintRegistrySpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service],
    provides: [Blueprint.RegistryService],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const capabilities = yield* Capability.Service;
        const blueprints = capabilities
          .getAll(AppCapabilities.BlueprintDefinition)
          .flatMap((blueprint) => blueprint.make());
        return Layer.succeed(Blueprint.RegistryService, new Blueprint.Registry(blueprints));
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

const AgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ProcessManager.ProcessManagerService],
    provides: [AgentService.AgentService],
  },
  () => AgentService.layer(),
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
 * Space-scoped override of {@link RemoteFunctionExecutionService}. Activated
 * only when the client's `runtime.client.edgeFeatures.agents` config is set;
 * falls back to the application-level spec otherwise.
 */
const RemoteFunctionExecutionOverrideSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService],
    provides: [RemoteFunctionExecutionService],
  },
  (context) =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for RemoteFunctionExecutionService override');
        const client = yield* ClientService;
        return RemoteFunctionExecutionService.fromClient(client, context.space);
      }),
    ),
);

const TriggerDispatcherSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [
      Database.Service,
      QueueService,
      TriggerStateStore,
      ProcessManager.ProcessManagerService,
      Registry.AtomRegistry,
    ],
    provides: [TriggerDispatcher],
  },
  () => TriggerDispatcher.layer({ timeControl: 'natural' }),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    const contributions: Capability.Any[] = [
      // FunctionInvocationSpec removed: see _FunctionInvocationSpec_Deprecated above.
      Capability.contributes(Capabilities.LayerSpec, OperationHandlerProviderSpec),
      Capability.contributes(Capabilities.LayerSpec, BlueprintRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, OpaqueToolkitSpec),
      Capability.contributes(Capabilities.LayerSpec, AgentServiceSpec),
      Capability.contributes(Capabilities.LayerSpec, OperationRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, TriggerStateStoreSpec),
      Capability.contributes(Capabilities.LayerSpec, FeedTraceSinkSpec),
      Capability.contributes(Capabilities.LayerSpec, TriggerDispatcherSpec),
      Capability.contributes(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver })),
      // Edge-mode override is conditional on runtime config, so it stays in the
      // activation block.
      Capability.contributes(Capabilities.LayerSpec, client.config.get('runtime.client.edgeFeatures.agents') ? RemoteFunctionExecutionSpec : RemoteFunctionExecutionOverrideSpec),
    ];

    return contributions;
  }),
);
