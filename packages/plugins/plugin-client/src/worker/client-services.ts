//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Scope from 'effect/Scope';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { WorkerCapabilities, WorkerEvents } from '@dxos/app-framework/worker';
import { makeRtcServiceClientOverProtocol } from '@dxos/client-protocol';
import { Events, ServiceStack, SqliteStorage, WorkerRuntime } from '@dxos/client-services';
import { Hook } from '@dxos/effect';
import { log } from '@dxos/log';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { layerMemory } from '@dxos/sql-sqlite/platform';

/**
 * Hosts the client services in the worker: contributes their layer specs (over the worker's
 * router, so every tab reaches them) and drives the stack through the worker's hooks — open on
 * `StackReady`, WebRTC through the tab that owns the worker, and the reset chain.
 */
export const ClientServices = Capability.inlineModule(
  'ClientServices',
  {
    activatesOn: WorkerEvents.Startup,
    requires: [WorkerCapabilities.Host],
    provides: [Capabilities.LayerSpec],
  },
  () =>
    Effect.gen(function* () {
      const host = yield* Capability.get(WorkerCapabilities.Host);
      const { config } = host;
      const scope = yield* Effect.scope;

      // A profile that must not persist (a webview whose OPFS cannot hand out sync handles) keeps
      // the database in memory; otherwise an unusable OPFS is reported now rather than per open.
      const persistent = config.get('runtime.client.storage.persistent') !== false;
      if (persistent) {
        yield* WorkerRuntime.probeOpfs;
      } else {
        log.warn('client services database is in memory: nothing survives a reload');
      }
      const sqlite = WorkerRuntime.layerSqlite(persistent ? undefined : layerMemory);
      const transportFactory = new RtcTransportProxyFactory();
      const tags = WorkerRuntime.signalMetadataTags(config);

      yield* Effect.all([
        Hook.on(WorkerEvents.StackReady, ({ stack }) =>
          WorkerRuntime.openStack(stack, tags).pipe(Scope.provide(scope)),
        ),
        // The owning tab carries the worker's WebRTC: only a browser tab can hold peer connections.
        Hook.on(WorkerEvents.SessionOpened, ({ isOwner, systemProtocol, scope: sessionScope }) =>
          isOwner
            ? Effect.gen(function* () {
                log('client services: routing webrtc through the owning tab');
                transportFactory.setRtcService(yield* makeRtcServiceClientOverProtocol(systemProtocol));
                yield* Effect.addFinalizer(() => Effect.sync(() => transportFactory.setRtcService(undefined)));
              }).pipe(Scope.provide(sessionScope))
            : Effect.void,
        ),
        Hook.on(Events.Closing, () => host.closeStack),
        // Over a SQLite layer of its own, since the stack's is gone by the time a reset gets here.
        Hook.on(Events.WipingStorage, () => SqliteStorage.wipeSqliteStorage.pipe(Effect.provide(sqlite), Effect.orDie)),
        Hook.on(Events.Reset, () => host.requestShutdown),
      ]).pipe(Effect.provideService(Hook.Controller, host.hooks));

      return Capability.contributeAll(Capabilities.LayerSpec, [
        WorkerRuntime.SqliteSpec(sqlite),
        ...ServiceStack.clientServiceSpecsFromConfig(config, {
          ...WorkerRuntime.workerStackOptions({ config, transportFactory }),
          // The services register on the worker's router, which every tab session is attached to.
          externalRouter: true,
        }),
      ]);
    }),
);
