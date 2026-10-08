//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Scope from 'effect/Scope';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import { ProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Registry } from '@dxos/echo';

import { type SpaceServices } from '../chat-model.ts';

type BaseSpaceServices = Exclude<SpaceServices, AgentService.AgentService>;

/** The ambient services a chat model needs besides the agent service. */
const pickBaseServices = Effect.map(Effect.context<BaseSpaceServices>(), (services) =>
  Layer.succeedContext(
    Context.pick(
      Database.Service,
      Credential.CredentialsService,
      AiService.AiService,
      Registry.Service,
      OpaqueToolkit.OpaqueToolkitProvider,
    )(services),
  ),
);

/** The chat model's space layer over the ambient services, including the real agent service. */
export const makeSpaceLayer: Effect.Effect<Layer.Layer<SpaceServices>, never, SpaceServices> = Effect.gen(function* () {
  const base = yield* pickBaseServices;
  const agentService = yield* AgentService.AgentService;
  return Layer.mergeAll(base, Layer.succeed(AgentService.AgentService, agentService));
});

/** The chat model's space layer with a stub agent service, to script the trace stream directly. */
export const makeStubSpaceLayer = (
  agentService: AgentService.Service,
): Effect.Effect<Layer.Layer<SpaceServices>, never, BaseSpaceServices> =>
  Effect.map(pickBaseServices, (base) => Layer.mergeAll(base, Layer.succeed(AgentService.AgentService, agentService)));

/**
 * A sound {@link Capabilities.ProcessManagerRuntime} for tests: a `ManagedRuntime` over the
 * assistant test layer's process services plus a bare `PluginManager` for the capability/plugin
 * tags. Scoped so the runtime is disposed with the test.
 */
export const makeTestRuntime: Effect.Effect<
  Capabilities.ProcessManagerRuntime,
  never,
  | ProcessManager.Service
  | Operation.Service
  | ProcessManager.ProcessOperationInvoker.Service
  | ServiceResolver.ServiceResolver
  | Scope.Scope
> = Effect.gen(function* () {
  const services = yield* Effect.context<
    | ProcessManager.Service
    | Operation.Service
    | ProcessManager.ProcessOperationInvoker.Service
    | ServiceResolver.ServiceResolver
  >();
  const manager = PluginManager.make({
    pluginLoader: (id: string) => Effect.die(new Error(`No plugins in test runtime: ${id}`)),
    plugins: [],
  });
  const runtime: Capabilities.ProcessManagerRuntime = ManagedRuntime.make(
    Layer.mergeAll(
      Layer.succeedContext(services),
      Layer.succeed(Capability.Service, manager.capabilities),
      Layer.succeed(Plugin.Service, manager),
    ),
  );
  yield* Effect.addFinalizer(() =>
    Effect.promise(() => (runtime as ManagedRuntime.ManagedRuntime<never, never>).dispose()),
  );
  return runtime;
});
