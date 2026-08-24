//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { OpaqueToolkit } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ClientService } from '@dxos/client';
import {
  FeedTraceSink,
  ProcessManager,
  RemoteOperationInvoker,
  RemoteProcessManager,
  RemoteTriggerManager,
  TriggerDispatcher,
  TriggerMonitor,
  TriggerStateStore,
} from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Registry } from '@dxos/echo';
import { EdgeOperationInvoker, EdgeProcessManager, EdgeTriggerManager } from '@dxos/edge-compute';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

//
// Capability Module
//
// Contributes application- and space-affinity `Capabilities.LayerSpec` entries
// that together replace the former monolithic `RoutineCapabilities.ComputeRuntime`.
//
// Specs are declared at module level; runtime state (the `Client`, contributed
// capability lists, etc.) is resolved via Effect-level requirements rather
// than captured from an outer scope.
//

/**
 * Gathers contributed {@link Capabilities.OperationHandler} sets from the
 * {@link Capability.Service} and exposes them through the
 * {@link OperationHandlerSet.OperationHandlerProvider} tag so space-affinity
 * specs (e.g. {@link OperationsToRegistrySpec}) can consume them through the
 * normal LayerStack resolution path.
 */
const OperationHandlerProviderSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service, Capabilities.AtomRegistry],
    provides: [OperationHandlerSet.OperationHandlerProvider],
  },
  () =>
    Layer.unwrap(
      Effect.gen(function* () {
        // Live view (not a one-shot snapshot): handlers contributed after materialization — e.g. by
        // a plugin enabled later — still reach subsequent reads. The manager memoizes one atom per
        // capability, so `reactive` reads the current contributions and re-merges when they change.
        // Declared in `requires`, so absence is a wiring bug rather than a recoverable error.
        const registry = yield* Capability.get(Capabilities.AtomRegistry).pipe(Effect.orDie);
        const sets = yield* Capability.atom(Capabilities.OperationHandler);
        return OperationHandlerSet.provide(OperationHandlerSet.reactive(registry, sets));
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
    Layer.unwrap(
      Effect.gen(function* () {
        const client = yield* ClientService;
        return Layer.succeed(Registry.Service, client.graph.registry);
      }),
    ),
);

const OpaqueToolkitSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service, Plugin.Service],
    provides: [OpaqueToolkit.OpaqueToolkitProvider],
  },
  () =>
    Layer.unwrap(
      Effect.gen(function* () {
        const capabilities = yield* Capability.Service;
        const pluginManager = yield* Plugin.Service;
        // Latched on success only: a fire-and-forget activation left the very first read — the one
        // a trigger-fired routine makes — returning a skill-less toolkit for the whole run, and a
        // latch set before the attempt made a failure permanent and silent.
        let skillsReady = false;
        const ensureSkills = Effect.suspend(() =>
          skillsReady
            ? Effect.void
            : pluginManager.activate(AppActivationEvents.AssistantStart).pipe(
                Effect.tap(() =>
                  Effect.sync(() => {
                    skillsReady = true;
                  }),
                ),
                Effect.tapError((error) =>
                  Effect.sync(() => log.warn('assistant skills activation failed', { error: String(error) })),
                ),
                Effect.ignore,
              ),
        );
        return Layer.succeed(OpaqueToolkit.OpaqueToolkitProvider, {
          // Toolkit materialization is the headless demand signal for the assistant feature (a
          // trigger-fired routine reaches here with no assistant UI open); skills ride the
          // assistant's start event, so the read has to happen after it lands.
          getToolkit: () =>
            ensureSkills.pipe(Effect.map(() => OpaqueToolkit.merge(...capabilities.getAll(AppCapabilities.Toolkit)))),
        });
      }),
    ),
);

const OperationsToRegistrySpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Registry.Service, OperationHandlerSet.OperationHandlerProvider, Capability.Service, Plugin.Service],
    provides: [Registry.Service],
  },
  () =>
    Layer.effect(
      Registry.Service,
      Effect.gen(function* () {
        const capabilities = yield* Capability.Service;
        const registry = yield* Registry.Service;
        const pluginManager = yield* Plugin.Service;
        // The snapshot below is one-shot, so every handler module must have contributed before it
        // runs. Today none declares an `activatesOn`, which makes that true by accident — a
        // one-line gate on any of them would silently drop its definitions from the registry.
        // Pulling Idle first makes the requirement explicit and survives that change.
        yield* pluginManager.activate(ActivationEvents.Idle).pipe(
          Effect.tapError((error) =>
            Effect.sync(() =>
              log.warn('idle activation failed before operation registration', { error: String(error) }),
            ),
          ),
          Effect.ignore,
        );
        // Registration needs only the definitions: keyed sets enumerate them without loading
        // any handler body; unkeyed sets still force their own handlers (per-set, not global).
        const sets = capabilities.getAll(Capabilities.OperationHandler);
        const sources = yield* Effect.promise(() =>
          Promise.all(sets.map((set) => (set.definitions ? set.definitions() : set.getHandlers()))),
        );
        const definitions = sources.flat();
        // The only point every operation in the app is visible at once. Tool names derive from keys
        // non-injectively (`Operation.toolName`), so two keys can claim one name — which the resolver
        // would only surface once a model asked for it.
        const collisions = Operation.findToolNameCollisions(definitions);
        invariant(
          collisions.size === 0,
          `Operations collide on derived tool name: ${[...collisions]
            .map(([name, keys]) => `${name} <- ${keys.join(', ')}`)
            .join('; ')}`,
        );
        registry.add(definitions.map(Operation.serialize));
        return registry;
      }),
    ),
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
    requires: [Database.Service],
    provides: [FeedTraceSink.FeedTraceSink],
  },
  () => FeedTraceSink.layerLive,
);

/**
 * Space-scoped remote operation invoker (EDGE). When edge agents are enabled
 * (`runtime.client.edgeFeatures.agents`) operations are invoked without a space
 * binding (the edge routes them); otherwise they are scoped to the space. The
 * config is read inside the factory — at slice-materialisation time, once
 * `ClientService` is available — so the owning module does not need the client
 * at activation time.
 */
const RemoteOperationInvokerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService],
    provides: [RemoteOperationInvoker.Service],
  },
  (context) =>
    Layer.unwrap(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for RemoteOperationInvoker');
        const client = yield* ClientService;
        const edgeAgents = client.config.get('runtime.client.edgeFeatures.agents');
        return EdgeOperationInvoker.fromClient(client, edgeAgents ? undefined : context.space);
      }),
    ),
);

/**
 * Space-scoped remote (EDGE) trigger manager, consumed by the aggregate
 * {@link TriggerMonitor}. Uses the EDGE implementation whenever an edge service
 * is configured (a trigger is routed here by its own `remote` flag, so the
 * manager should exist wherever edge is reachable), otherwise a no-op.
 */
const RemoteTriggerManagerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService, AtomRegistry.AtomRegistry],
    provides: [RemoteTriggerManager.Service],
  },
  (context) =>
    Layer.unwrap(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for RemoteTriggerManager');
        const client = yield* ClientService;
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        return edgeUrl ? EdgeTriggerManager.fromClient(client, context.space) : RemoteTriggerManager.layerNoop;
      }),
    ),
);

/**
 * Application-scoped remote (EDGE) process manager, providing the progress meter's cancel control.
 * Uses the EDGE implementation whenever an edge service is configured — cancel is addressed by trigger
 * id + space, so it is not space-scoped — otherwise a read-only no-op. Resolved by the progress trace
 * sink to route an edge-run trigger's cancel; the aggregate {@link TriggerMonitor} view is unaffected.
 */
const RemoteProcessManagerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService, AtomRegistry.AtomRegistry],
    provides: [RemoteProcessManager.Service],
  },
  () =>
    Layer.unwrap(
      Effect.gen(function* () {
        const client = yield* ClientService;
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        return edgeUrl ? EdgeProcessManager.fromClient(client) : RemoteProcessManager.layerNoop;
      }),
    ),
);

const TriggerDispatcherSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Database.Service, TriggerStateStore, ProcessManager.ProcessManagerService, AtomRegistry.AtomRegistry],
    provides: [TriggerDispatcher],
  },
  () => TriggerDispatcher.layer({ timeControl: 'natural' }),
);

/**
 * Aggregate {@link Trigger.TriggerMonitorService} over the local
 * {@link TriggerDispatcher} and the remote {@link RemoteTriggerManager.Service}.
 * Provides a unified view of trigger state across local and edge environments.
 */
const TriggerMonitorSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [TriggerDispatcher, Database.Service, AtomRegistry.AtomRegistry, RemoteTriggerManager.Service],
    provides: [Trigger.TriggerMonitorService],
  },
  () => TriggerMonitor.layer,
);

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributeAll(Capabilities.LayerSpec, [
      OperationHandlerProviderSpec,
      RegistrySpec,
      OpaqueToolkitSpec,
      OperationsToRegistrySpec,
      TriggerStateStoreSpec,
      FeedTraceSinkSpec,
      TriggerDispatcherSpec,
      RemoteTriggerManagerSpec,
      TriggerMonitorSpec,
      RemoteOperationInvokerSpec,
      RemoteProcessManagerSpec,
    ]),
    Capability.contribute(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver })),
  ]),
);
