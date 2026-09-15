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
// TODO(dmaretskyi): Convert to effect
const probeOpfsAvailable = async (): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      await navigator.storage.getDirectory();
      return true;
    }
  } catch {
    log.warn('OPFS not available, disabling persistent indexing');
  }
  return false;
};

/** Runs the dedicated worker loop. Exported so apps can use a custom worker entrypoint and inject setup (e.g. observability). */
export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): void => {
  Worker.run({
    storageLockKey: STORAGE_LOCK_KEY,
    createRuntime: ({ config: configValues, requestShutdown }) =>
      Effect.gen(function* () {
        const config = new Config(configValues ?? {});
        log('dedicated-worker: probing OPFS availability');
        const opfsAvailable = yield* Effect.promise(() => probeOpfsAvailable());
        log('dedicated-worker: OPFS probe complete', { opfsAvailable });

        const runtime = makeWorkerRuntime({
          // TODO(dmaretskyi): Convert promises -> effect
          configProvider: async () => config,
          onStop: async () => {
            log('dedicated-worker: WorkerRuntime onStop, closing self');
            requestShutdown();
          },
          // TODO(dmaretskyi): Check if those are still used? if not -- delete
          acquireLock: async () => {},
          releaseLock: () => {},
          automaticallyConnectWebrtc: false,
          sqliteLayer: options.sqliteLayer ?? (opfsAvailable ? undefined : layerMemory),
        });

        if (options.onBeforeStart) {
          log('dedicated-worker: running onBeforeStart');
          yield* Effect.promise(() => options.onBeforeStart!(config));
          log('dedicated-worker: onBeforeStart complete');
        }

        log('dedicated-worker: starting WorkerRuntime');
        yield* runtime.start();
        log('dedicated-worker: WorkerRuntime started');
        if (options.onStart) {
          yield* Effect.promise(() => options.onStart!(runtime.stack()));
        }

        return {
          stop: () => runtime.stop(),
          // The framework hands the session the forward (tab→worker) and reverse (worker→tab) protocol
          // layers via effect context. The WorkerRuntime session manages its own lifecycle (it closes
          // when the tab-liveness lock releases), so the effect opens the session then blocks — the
          // framework runs it for the session's lifetime.
          createSession: ({ clientId, isOwner }) =>
            Effect.gen(function* () {
              const appProtocol = yield* RpcServer.Protocol;
              const systemProtocol = yield* RpcClient.Protocol;
              const session = yield* runtime.createSession({ appProtocol, systemProtocol });
              if (isOwner) {
                performance.mark('dedicated-worker:session-ready');
                log('dedicated-worker: connecting webrtc bridge to owning client', { clientId });
                yield* runtime.connectWebrtcBridge(session);
              }
              return yield* Effect.never;
            }),
        };
      }),
  });
};
