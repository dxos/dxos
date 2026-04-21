//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, GenericToolkit } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AgentService } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client/echo';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import {
  CredentialsService,
  FunctionInvocationService,
  LayerSpec,
  QueueService,
  Trace,
  TracingService,
} from '@dxos/functions';
import {
  FeedTraceSink,
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
  TracingServiceExt,
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
    const functionInvocationSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [Feed.FeedService, QueueService, AiService.AiService, CredentialsService, Database.Service],
        provides: [FunctionInvocationService, FunctionImplementationResolver, RemoteFunctionExecutionService],
      },
      () => {
        const remoteLayer = RemoteFunctionExecutionService.fromClient(client);
        const implementationResolverLayer = FunctionImplementationResolver.layerTest({
          functions: mergedOperationHandlers,
        });
        const functionInvocationLayer = FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
          Layer.provide(implementationResolverLayer),
          Layer.provide(remoteLayer),
        );
        return Layer.mergeAll(functionInvocationLayer, implementationResolverLayer, remoteLayer);
      },
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

    const genericToolkitSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [GenericToolkit.GenericToolkitProvider],
      },
      () =>
        Layer.succeed(GenericToolkit.GenericToolkitProvider, {
          getToolkit: () => {
            const toolkits = capabilities.getAll(AppCapabilities.Toolkit);
            return GenericToolkit.merge(...toolkits);
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

    const triggerStateStoreSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [TriggerStateStore],
      },
      () => TriggerStateStore.layerKv.pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage)),
    );

    //
    // Space-affinity specs.
    //

    const feedTraceSinkSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Database.Service, Feed.FeedService],
        provides: [FeedTraceSink.FeedTraceSink, Trace.TraceSink],
      },
      () => FeedTraceSink.layerLive,
    );

    const tracingLiveSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Database.Service, QueueService],
        provides: [TracingService],
      },
      () =>
        Layer.unwrapEffect(
          Effect.gen(function* () {
            const objects = yield* Database.runQuery(Query.type(SpaceProperties));
            const [properties] = objects;
            invariant(properties);
            if (!properties.invocationTraceQueue || !properties.invocationTraceQueue.target) {
              const queue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
              Obj.change(properties, (properties) => {
                properties.invocationTraceQueue = Ref.fromDXN(queue.dxn);
              });
            }
            const queue = properties.invocationTraceQueue!.target;
            invariant(queue);
            return TracingServiceExt.layerInvocationsQueue({ invocationTraceQueue: queue });
          }),
        ),
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
          TracingService,
          ProcessManager.ProcessManagerService,
          Registry.AtomRegistry,
        ],
        provides: [TriggerDispatcher],
      },
      () => TriggerDispatcher.layer({ timeControl: 'natural' }),
    );

    const contributions = [
      Capability.contributes(Capabilities.LayerSpec, functionInvocationSpec),
      Capability.contributes(Capabilities.LayerSpec, blueprintRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, genericToolkitSpec),
      Capability.contributes(Capabilities.LayerSpec, agentServiceSpec),
      Capability.contributes(Capabilities.LayerSpec, operationRegistrySpec),
      Capability.contributes(Capabilities.LayerSpec, triggerStateStoreSpec),
      Capability.contributes(Capabilities.LayerSpec, feedTraceSinkSpec),
      Capability.contributes(Capabilities.LayerSpec, tracingLiveSpec),
      Capability.contributes(Capabilities.LayerSpec, triggerDispatcherSpec),
    ];

    if (remoteFunctionExecutionOverrideSpec) {
      contributions.push(Capability.contributes(Capabilities.LayerSpec, remoteFunctionExecutionOverrideSpec));
    }

    return contributions;
  }),
);
