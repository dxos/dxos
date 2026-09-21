//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { makeWorkerRuntime } from '@dxos/client-services';
import { LayerStack } from '@dxos/compute-runtime';
import { Config } from '@dxos/config';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../../lock-key.ts';

export type RunDedicatedWorkerOptions = {
  /** Called with the worker config before the runtime starts. Use to e.g. initialize observability in the worker. */
  onBeforeStart?: (config: Config) => Promise<void>;
  /** Runs once the runtime has started, with the effect context of the stack it serves. */
  onStart?: (stack: LayerStack.LayerStack) => Promise<void>;
  /** Storage for the runtime; OPFS-backed SQLite by default. */
  sqliteLayer?: Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport, unknown>;
};

const OPFS_PROBE_FILE = '.dxos-opfs-probe';

class OpfsUnavailableError extends BaseError.extend('OpfsUnavailableError', 'OPFS storage is unusable.') {}

/** Only the WebWorker lib declares this method, and this package compiles against DOM. */
type SyncAccessFileHandle = FileSystemFileHandle & { createSyncAccessHandle(): Promise<{ close(): void }> };

const hasSyncAccessHandle = (file: FileSystemFileHandle): file is SyncAccessFileHandle =>
  'createSyncAccessHandle' in file && typeof file.createSyncAccessHandle === 'function';

/**
 * Takes and releases the kind of handle the SQLite VFS opens, so an OPFS that cannot serve one is
 * reported here rather than failing every database open for the life of the page. There is no
 * in-memory fallback: it would show none of the stored data and keep nothing written to it.
 */
const probeOpfs = Effect.tryPromise({
  try: async () => {
    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(OPFS_PROBE_FILE, { create: true });
    if (!hasSyncAccessHandle(file)) {
      throw new Error('OPFS has no sync access handles.');
    }
    const handle = await file.createSyncAccessHandle();
    handle.close();
    await root.removeEntry(OPFS_PROBE_FILE).catch((err) => log.warn('OPFS probe file not removed', { err }));
  },
  catch: OpfsUnavailableError.wrap(),
}).pipe(Effect.orDie);

/** Runs the dedicated worker loop. Exported so apps can use a custom worker entrypoint and inject setup (e.g. observability). */
export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): void => {
  Worker.run({
    storageLockKey: STORAGE_LOCK_KEY,
    createRuntime: ({ config: configValues, requestShutdown }) =>
      Effect.gen(function* () {
        const config = new Config(configValues ?? {});
        if (!options.sqliteLayer) {
          log('dedicated-worker: probing OPFS');
          yield* probeOpfs;
        }

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
          sqliteLayer: options.sqliteLayer,
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
