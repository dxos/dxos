//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import { AiService, Model, OpaqueToolkit, Provider } from '@dxos/ai';
import { RemoteEdgeAiServiceLayer } from '@dxos/ai/testing';
import { Harness } from '@dxos/assistant';
import { type Client } from '@dxos/client';
import {
  ProcessManager,
  RemoteProcessManager,
  RemoteTraceMonitor,
  UnifiedProcessManager,
  configuredCredentialsLayer,
} from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN, Registry as EchoRegistry, Hypergraph } from '@dxos/echo';
import { registryLayer } from '@dxos/echo-client';
import { EdgeProcessManager } from '@dxos/edge-compute';

import { PermissionHandlers } from './permissions.ts';

/** Fast enough for a demo that waits on several agents at once. */
export const AGENT_MODEL: DXN.DXN = Model.claudeHaiku45.id;

export type AgentLayerOptions = {
  /** Shared with React so process status atoms render from the registry that updates them. */
  registry: AtomRegistry.AtomRegistry;
  client: Client;
  db: Database.Database;
  /** Connect the remote half to the client's EDGE service; otherwise an `edge` agent dies at spawn. */
  edge: boolean;
};

/** Late-bound manager: the resolver serves the harness from it, but the manager itself needs the resolver. */
type ProcessManagerHolder = { current?: Context.Service.Shape<typeof ProcessManager.Service> };

const captureProcessManager = (holder: ProcessManagerHolder): Layer.Layer<never, never, ProcessManager.Service> =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      holder.current = yield* ProcessManager.Service;
    }),
  );

/** What operations and the agent process resolve: the space's database, the model, and the harness for a conversation. */
const serviceResolverLayer = (holder: ProcessManagerHolder) =>
  Layer.effect(
    ServiceResolver.ServiceResolver,
    Effect.gen(function* () {
      const runtime = yield* Effect.context<Database.Service>().pipe(Effect.map(Context.pick(Database.Service)));
      const { db } = yield* Database.Service;
      return ServiceResolver.compose(
        ServiceResolver.succeed(Harness.HarnessService, (context) =>
          Effect.gen(function* () {
            const processManager = holder.current;
            if (!context.conversation || !processManager) {
              return yield* Effect.fail(new ServiceResolver.ServiceNotAvailableError(Harness.HarnessService.key));
            }
            return yield* Harness.make({ conversation: context.conversation, processManager, runtime });
          }),
        ),
        ServiceResolver.succeed(Hypergraph.Service, () => Effect.succeed(Hypergraph.makeService(db.graph))),
        yield* ServiceResolver.fromRequirements(
          Database.Service,
          OpaqueToolkit.OpaqueToolkitProvider,
          AiService.AiService,
          EchoRegistry.Service,
          Credential.CredentialsService,
        ),
      );
    }),
  );

/** The operation registry the agent's tools resolve from: the story's handlers, with their declared requirements. */
const operationRegistryLayer = Layer.effect(
  EchoRegistry.Service,
  Effect.gen(function* () {
    const registry = yield* EchoRegistry.Service;
    const handlers = yield* (yield* OperationHandlerSet.OperationHandlerProvider).handlers;
    registry.add(Operation.serializable(handlers));
    return registry;
  }),
).pipe(Layer.provide(registryLayer()));

/**
 * The agent runtime of the permissions story: {@link AgentService.AgentService} over a local process
 * manager (and EDGE's, when `edge`), a real model through the EDGE AI service, and the story's
 * declared operations as the only tools.
 */
export const makeAgentLayer = ({
  registry,
  client,
  db,
  edge,
}: AgentLayerOptions): Layer.Layer<
  AgentService.AgentService | Process.ManagerService | Database.Service | EchoRegistry.Service
> => {
  const holder: ProcessManagerHolder = {};
  return Layer.empty.pipe(
    Layer.provideMerge(AgentServiceRuntime.layer({ defaultModel: AGENT_MODEL, provider: Provider.edge.id })),
    Layer.provideMerge(UnifiedProcessManager.layer),
    Layer.provideMerge(edge ? EdgeProcessManager.fromClient(client) : RemoteProcessManager.layerNoop),
    Layer.provideMerge(RemoteTraceMonitor.layerNoop),
    Layer.provideMerge(captureProcessManager(holder)),
    Layer.provideMerge(ProcessManager.layer()),
    Layer.provideMerge(serviceResolverLayer(holder)),
    Layer.provideMerge(operationRegistryLayer),
    Layer.provideMerge(OperationHandlerSet.provide(PermissionHandlers)),
    Layer.provideMerge(OpaqueToolkit.providerLayer(OpaqueToolkit.empty)),
    Layer.provideMerge(configuredCredentialsLayer([])),
    Layer.provideMerge(RemoteEdgeAiServiceLayer),
    Layer.provideMerge(Database.layer(db)),
    Layer.provideMerge(Trace.layerNoop),
    Layer.provideMerge(KeyValueStore.layerMemory),
    Layer.provideMerge(Layer.succeed(Registry.AtomRegistry, registry)),
    Layer.orDie,
  );
};
