//
// Copyright 2026 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { runWorker } from '@dxos/worker-framework/worker';

import { STORAGE_LOCK_KEY } from '../../lock-key';

export type RunDedicatedWorkerOptions = {
  /** Called with the worker config before the runtime starts. Use to e.g. initialize observability in the worker. */
  onBeforeStart?: (config: Config) => Promise<void>;
};

/** Runs the dedicated worker loop. Exported so apps can use a custom worker entrypoint and inject setup (e.g. observability). */
export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): void => {
  runWorker({
    storageLockKey: STORAGE_LOCK_KEY,
    createRuntime: async ({ config: configValues, requestShutdown }) => {
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

      const runtime = new WorkerRuntime({
        configProvider: async () => config,
        onStop: async () => {
          log('dedicated-worker: WorkerRuntime onStop, closing self');
          requestShutdown();
        },
        acquireLock: async () => {},
        releaseLock: () => {},
        automaticallyConnectWebrtc: false,
        // Liveness and displacement are owned by worker-framework's runWorker.
        manageLifecycle: false,
        sqliteLayer: opfsAvailable ? undefined : layerMemory,
      });

      if (options.onBeforeStart) {
        log('dedicated-worker: running onBeforeStart');
        await options.onBeforeStart(config);
        log('dedicated-worker: onBeforeStart complete');
      }

      log('dedicated-worker: starting WorkerRuntime');
      await runtime.start();
      log('dedicated-worker: WorkerRuntime started');

      return {
        stop: async () => runtime.stop(),
        createSession: async ({ appPort, systemPort, clientId, isOwner, onClose }) => {
          const session = await runtime.createSession({
            // TODO(dmaretskyi): Eliminate RpcPort for worker-related code and rely on MessagePort instead.
            systemPort: createWorkerPort({ port: systemPort }),
            appPort,
            onClose,
          });
          if (isOwner) {
            performance.mark('dedicated-worker:session-ready');
            log('dedicated-worker: connecting webrtc bridge to owning client', { clientId });
            runtime.connectWebrtcBridge(session);
          }
        },
      };
    },
  });
};
