//
// Copyright 2026 DXOS.org
//

import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';

import { makeWorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../../lock-key';

export type RunDedicatedWorkerOptions = {
  /** Called with the worker config before the runtime starts. Use to e.g. initialize observability in the worker. */
  onBeforeStart?: (config: Config) => Promise<void>;
};

/** Runs the dedicated worker loop. Exported so apps can use a custom worker entrypoint and inject setup (e.g. observability). */
export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): void => {
  Worker.run({
    storageLockKey: STORAGE_LOCK_KEY,
    createRuntime: ({ config: configValues, requestShutdown }) =>
      Effect.promise(async () => {
        const config = new Config(configValues ?? {});
        log('dedicated-worker: probing OPFS availability');
        let opfsAvailable = false;
        try {
          if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
            await navigator.storage.getDirectory();
            opfsAvailable = true;
          }
        } catch {
          log.warn('OPFS not available, disabling persistent indexing');
          opfsAvailable = false;
        }
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
          await options.onBeforeStart(config);
          log('dedicated-worker: onBeforeStart complete');
        }

        log('dedicated-worker: starting WorkerRuntime');
        await EffectEx.runPromise(runtime.start());
        log('dedicated-worker: WorkerRuntime started');

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
