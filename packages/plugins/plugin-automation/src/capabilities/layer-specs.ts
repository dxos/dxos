//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AgentService } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { ClientService } from '@dxos/client';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed } from '@dxos/echo';
import { CredentialsService, FunctionInvocationService, LayerSpec, QueueService } from '@dxos/functions';
import {
  FeedTraceSink,
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
  TriggerDispatcher,
  TriggerStateStore,
} from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { OperationHandlerSet, OperationRegistry } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';

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
 * Composes {@link FunctionInvocationService} with local + remote execution.
 * {@link RemoteFunctionExecutionService} is sourced from the environment (a
 * sibling LayerSpec) so a space-affinity spec can override it without
 * rebuilding `FunctionInvocationService`.
 */
const FunctionInvocationSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [
      Feed.FeedService,
      QueueService,
      AiService.AiService,
      CredentialsService,
      Database.Service,
      RemoteFunctionExecutionService,
      OperationHandlerSet.OperationHandlerProvider,
    ],
    provides: [FunctionInvocationService, FunctionImplementationResolver],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
        const implementationResolverLayer = FunctionImplementationResolver.layerTest({
          functions: handlerSet,
        });
        const functionInvocationLayer = FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
          Layer.provide(implementationResolverLayer),
        );
        return Layer.mergeAll(functionInvocationLayer, implementationResolverLayer);
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
      Capability.contributes(Capabilities.LayerSpec, FunctionInvocationSpec),
      Capability.contributes(Capabilities.LayerSpec, RemoteFunctionExecutionSpec),
      Capability.contributes(Capabilities.LayerSpec, OperationHandlerProviderSpec),
      Capability.contributes(Capabilities.LayerSpec, BlueprintRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, OpaqueToolkitSpec),
      Capability.contributes(Capabilities.LayerSpec, AgentServiceSpec),
      Capability.contributes(Capabilities.LayerSpec, OperationRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, TriggerStateStoreSpec),
      Capability.contributes(Capabilities.LayerSpec, FeedTraceSinkSpec),
      Capability.contributes(Capabilities.LayerSpec, TriggerDispatcherSpec),
      Capability.contributes(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver })),
    ];

    // Edge-mode override is conditional on runtime config, so it stays in the
    // activation block.
    if (client.config.get('runtime.client.edgeFeatures.agents')) {
      contributions.push(Capability.contributes(Capabilities.LayerSpec, RemoteFunctionExecutionOverrideSpec));
    }

    return contributions;
  }),
);
