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

/** Removed as soon as the probe below has opened it. */
const OPFS_PROBE_FILE = '.dxos-opfs-probe';

/** Only the WebWorker lib declares this method, and this package compiles against DOM. */
type SyncAccessFileHandle = FileSystemFileHandle & { createSyncAccessHandle(): Promise<{ close(): void }> };

const hasSyncAccessHandle = (file: FileSystemFileHandle): file is SyncAccessFileHandle =>
  'createSyncAccessHandle' in file && typeof file.createSyncAccessHandle === 'function';

/**
 * Probes whether OPFS is usable in this worker — it is not in private browsing, and WebKit can fail
 * it for what it calls a transient reason.
 *
 * Takes a sync access handle rather than just resolving the directory: that is what the SQLite VFS
 * needs, and a directory that resolves is no promise the handle will follow. Getting this wrong
 * commits the worker to a storage layer it cannot open, which it then retries for the life of the
 * page instead of falling back to memory.
 */
const probeOpfsAvailable: Effect.Effect<boolean> = Effect.promise(async () => {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      return false;
    }

    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(OPFS_PROBE_FILE, { create: true });
    if (!hasSyncAccessHandle(file)) {
      log.warn('OPFS has no sync access handles, falling back to in-memory storage');
      return false;
    }

    const handle = await file.createSyncAccessHandle();
    handle.close();
    await root.removeEntry(OPFS_PROBE_FILE).catch((err) => log.warn('OPFS probe file not removed', { err }));
    return true;
  } catch (err) {
    log.warn('OPFS not usable, falling back to in-memory storage', { err });
    return false;
  }
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
