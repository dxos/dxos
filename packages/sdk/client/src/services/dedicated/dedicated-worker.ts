//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type ClientServicesStackContext, makeWorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../../lock-key.ts';

export type RunDedicatedWorkerOptions = {
  /** Called with the worker config before the runtime starts. Use to e.g. initialize observability in the worker. */
  onBeforeStart?: (config: Config) => Promise<void>;
  /** Runs once the runtime has started, with the effect context of the stack it serves. */
  onStart?: (stack: EffectContext.Context<ClientServicesStackContext>) => Promise<void>;
  /** Storage for the runtime; by default OPFS-backed SQLite, or in-memory where OPFS is unavailable. */
  sqliteLayer?: Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport, unknown>;
};

/**
 * Probes whether OPFS is available in this worker (it is not, e.g., in private-browsing contexts),
 * gating persistent indexing.
 */
const probeOpfsAvailable: Effect.Effect<boolean> = Effect.gen(function* () {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    return false;
  }
  return yield* Effect.tryPromise(() => navigator.storage.getDirectory()).pipe(
    Effect.as(true),
    Effect.catch(() => Effect.sync(() => (log.warn('OPFS not available, disabling persistent indexing'), false))),
  );
});

/** Runs the dedicated worker loop. Exported so apps can use a custom worker entrypoint and inject setup (e.g. observability). */
export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): void => {
  Worker.run({
    storageLockKey: STORAGE_LOCK_KEY,
    createRuntime: ({ config: configValues, requestShutdown }) =>
      Effect.gen(function* () {
        const config = new Config(configValues ?? {});
        log('dedicated-worker: probing OPFS availability');
        const opfsAvailable = yield* probeOpfsAvailable;
        log('dedicated-worker: OPFS probe complete', { opfsAvailable });

        if (options.onBeforeStart) {
          log('dedicated-worker: running onBeforeStart');
          yield* Effect.promise(() => options.onBeforeStart!(config));
          log('dedicated-worker: onBeforeStart complete');
        }

        log('dedicated-worker: starting WorkerRuntime');
        const runtime = yield* makeWorkerRuntime({
          configProvider: Effect.succeed(config),
          requestShutdown: Effect.sync(() => {
            log('dedicated-worker: WorkerRuntime requested shutdown');
            requestShutdown();
          }),
          automaticallyConnectWebrtc: false,
          sqliteLayer: options.sqliteLayer ?? (opfsAvailable ? undefined : layerMemory),
        });
        log('dedicated-worker: WorkerRuntime started');
        if (options.onStart) {
          yield* Effect.promise(() => options.onStart!(runtime.stack()));
        }

        return {
          // The framework hands the session its protocol layers via effect context and owns its
          // lifetime: the session scope closes when the tab goes away.
          createSession: ({ clientId, isOwner }) =>
            Effect.gen(function* () {
              const appProtocol = yield* RpcServer.Protocol;
              const systemProtocol = yield* RpcClient.Protocol;
              const session = yield* runtime.createSession({ appProtocol, systemProtocol });
              if (isOwner) {
                performance.mark('dedicated-worker:session-ready');
                log('dedicated-worker: connecting webrtc bridge to owning client', { clientId });
                yield* runtime.connectWebrtc(session);
              }
            }),
        };
      }),
  });
};
