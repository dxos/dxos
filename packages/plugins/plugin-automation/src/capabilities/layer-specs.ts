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
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed } from '@dxos/echo';
import {
  CredentialsService,
  FunctionInvocationService,
  LayerSpec,
  QueueService,
} from '@dxos/functions';
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

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const client = yield* Capability.get(ClientCapabilities.Client);

    const operationHandlerSets = yield* Capability.getAll(Capabilities.OperationHandler);
    const mergedOperationHandlers =
      operationHandlerSets.length === 0
        ? OperationHandlerSet.empty
        : OperationHandlerSet.merge(...operationHandlerSets);

    //
    // Application-affinity specs.
    //

    // Composes FunctionInvocationService with local + remote execution.
    // `RemoteFunctionExecutionService` is sourced from the environment (a
    // sibling LayerSpec), so a space-affinity spec can override it without
    // rebuilding `FunctionInvocationService`.
    const functionInvocationSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [
          Feed.FeedService,
          QueueService,
          AiService.AiService,
          CredentialsService,
          Database.Service,
          RemoteFunctionExecutionService,
        ],
        provides: [FunctionInvocationService, FunctionImplementationResolver],
      },
      () => {
        const implementationResolverLayer = FunctionImplementationResolver.layerTest({
          functions: mergedOperationHandlers,
        });
        const functionInvocationLayer = FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
          Layer.provide(implementationResolverLayer),
        );
        return Layer.mergeAll(functionInvocationLayer, implementationResolverLayer);
      },
    );

    // Default application-affinity `RemoteFunctionExecutionService`. Space
    // specs (see `remoteFunctionExecutionOverrideSpec`) can override this with
    // a space-scoped client.
    const remoteFunctionExecutionSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [RemoteFunctionExecutionService],
      },
      () => RemoteFunctionExecutionService.fromClient(client),
    );

    // Exposes merged operation handlers via the OperationHandlerProvider tag
    // so that space-affinity specs (e.g. `operationRegistrySpec`) can consume
    // them through the normal LayerStack resolution path.
    const operationHandlerProviderSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [OperationHandlerSet.OperationHandlerProvider],
      },
      () => OperationHandlerSet.provide(mergedOperationHandlers),
    );

    const blueprintRegistrySpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [Blueprint.RegistryService],
      },
      () => {
        const blueprints = capabilities
          .getAll(AppCapabilities.BlueprintDefinition)
          .flatMap((blueprint) => blueprint.make());
        return Layer.succeed(Blueprint.RegistryService, new Blueprint.Registry(blueprints));
      },
    );

    const opaqueToolkitSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [OpaqueToolkit.OpaqueToolkitProvider],
      },
      () =>
        Layer.succeed(OpaqueToolkit.OpaqueToolkitProvider, {
          getToolkit: () => {
            const toolkits = capabilities.getAll(AppCapabilities.Toolkit);
            return OpaqueToolkit.merge(...toolkits);
          },
        }),
    );

    const agentServiceSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [ProcessManager.ProcessManagerService],
        provides: [AgentService.AgentService],
      },
      () => AgentService.layer(),
    );

    const operationRegistrySpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Database.Service, OperationHandlerSet.OperationHandlerProvider],
        provides: [OperationRegistry.Service],
      },
      () => OperationRegistry.layer,
    );

    // In-memory trigger state. Loses state across restarts but works in both
    // browser and CLI/Node contexts. Hosts that need durable storage should
    // contribute a replacement LayerSpec that provides `TriggerStateStore`
    // backed by a persistent `KeyValueStore` (e.g. `BrowserKeyValueStore` or
    // `BunKeyValueStore`).
    const triggerStateStoreSpec = LayerSpec.make(
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

    const feedTraceSinkSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Database.Service, Feed.FeedService],
        provides: [FeedTraceSink.FeedTraceSink],
      },
      () => FeedTraceSink.layerLive,
    );

    const remoteFunctionExecutionOverrideSpec = client.config.get('runtime.client.edgeFeatures.agents')
      ? LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [RemoteFunctionExecutionService],
          },
          (context) => {
            invariant(context.space, 'space context required for RemoteFunctionExecutionService override');
            return RemoteFunctionExecutionService.fromClient(client, context.space);
          },
        )
      : undefined;

    const triggerDispatcherSpec = LayerSpec.make(
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

    const contributions = [
      Capability.contributes(Capabilities.LayerSpec, functionInvocationSpec),
      Capability.contributes(Capabilities.LayerSpec, remoteFunctionExecutionSpec),
      Capability.contributes(Capabilities.LayerSpec, operationHandlerProviderSpec),
      Capability.contributes(Capabilities.LayerSpec, blueprintRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, opaqueToolkitSpec),
      Capability.contributes(Capabilities.LayerSpec, agentServiceSpec),
      Capability.contributes(Capabilities.LayerSpec, operationRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, triggerStateStoreSpec),
      Capability.contributes(Capabilities.LayerSpec, feedTraceSinkSpec),
      Capability.contributes(Capabilities.LayerSpec, triggerDispatcherSpec),
      Capability.contributes(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver })),
    ];

    if (remoteFunctionExecutionOverrideSpec) {
      contributions.push(Capability.contributes(Capabilities.LayerSpec, remoteFunctionExecutionOverrideSpec));
    }

    return contributions;
  }),
);
