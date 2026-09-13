//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { type ClientServicesHost, makeWorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../../lock-key.ts';

export type RunDedicatedWorkerOptions = {
  /** Called with the worker config before the runtime starts. Use to e.g. initialize observability in the worker. */
  onBeforeStart?: (config: Config) => Promise<void>;
  /** Runs once the runtime has started, with the host it serves from. */
  onStart?: (host: ClientServicesHost) => Promise<void>;
};

/** Removed as soon as the probe below has opened it. */
const OPFS_PROBE_FILE = '.dxos-opfs-probe';

/**
 * Probes whether OPFS is usable in this worker — it is not in private browsing, and WebKit can fail
 * it for what it calls a transient reason.
 *
 * Takes a sync access handle rather than just resolving the directory: that is what the SQLite VFS
 * needs, and a directory that resolves is no promise the handle will follow. Getting this wrong
 * commits the worker to a storage layer it cannot open, which it then retries for the life of the
 * page instead of falling back to memory.
 */
const probeOpfsAvailable = async (): Promise<boolean> => {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      return false;
    }

    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(OPFS_PROBE_FILE, { create: true });
    const handle = await (file as any).createSyncAccessHandle();
    handle.close();
    await root.removeEntry(OPFS_PROBE_FILE).catch(() => {});
    return true;
  } catch (err) {
    log.warn('OPFS not usable, falling back to in-memory storage', { err });
    return false;
  }
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
          configProvider: async () => config,
          onStop: async () => {
            log('dedicated-worker: WorkerRuntime onStop, closing self');
            requestShutdown();
          },
          acquireLock: async () => {},
          releaseLock: () => {},
          automaticallyConnectWebrtc: false,
          sqliteLayer: opfsAvailable ? undefined : layerMemory,
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
          yield* Effect.promise(() => options.onStart!(runtime.host));
        }

        return {
          stop: async () => EffectEx.runPromise(runtime.stop()),
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
