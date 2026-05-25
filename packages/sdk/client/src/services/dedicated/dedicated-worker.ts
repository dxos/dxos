// Entrypoint for dedicated worker.

//
// Copyright 2026 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import { STORAGE_LOCK_KEY } from '../../lock-key';
import type { DedicatedWorkerMessage } from './types';

export type RunDedicatedWorkerOptions = {
  /** Called with the worker config before the runtime starts. Use to e.g. initialize observability in the worker. */
  onBeforeStart?: (config: Config) => Promise<void>;
};

/** Runs the dedicated worker loop. Exported so apps can use a custom worker entrypoint and inject setup (e.g. observability). */
export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): void => {
  void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
    log('lock acquired');

    let runtime: WorkerRuntime;
    let owningClientId: string;
    const tabsProcessed = new Set<string>();

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const handleMessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
      const message = ev.data;
      log('worker message received', { type: message.type });
      switch (message.type) {
        case 'init': {
          owningClientId = message.ownerClientId ?? message.clientId;
          const config = new Config(message.config ?? {});
          log('worker init with config', { keys: Object.keys(message.config ?? {}) });
          // TODO(wittjosiah): OPFS doesn't work in Playwright's WebKit (works in real Safari).
          //   https://github.com/microsoft/playwright/issues/18235
          //   Test if OPFS is actually available before enabling SQLite.
          log('dedicated-worker: probing OPFS availability');
          let opfsAvailable = false;
          try {
            if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
              await navigator.storage.getDirectory();
              opfsAvailable = true;
            }
          } catch {
            // OPFS not available (e.g., Playwright WebKit).
            log.warn('OPFS not available, disabling persistent indexing');
            opfsAvailable = false;
          }
          log('dedicated-worker: OPFS probe complete', { opfsAvailable });
          log('dedicated-worker: constructing WorkerRuntime');
          runtime = new WorkerRuntime({
            configProvider: async () => config,
            onStop: async () => {
              log('dedicated-worker: WorkerRuntime onStop, closing self');
              // Close the shared worker, lock will be released automatically.
              self.close();
              releaseLock();
            },
            // TODO(dmaretskyi): We should split the storage lock and liveness. Keep storage lock fully inside WorkerRuntime, while liveness stays outside.
            acquireLock: async () => {},
            releaseLock: () => {},
            automaticallyConnectWebrtc: false,
            // Only enable SQLite if OPFS is available (fails in Playwright WebKit).
            sqliteLayer: opfsAvailable ? undefined : layerMemory,
          });
          if (options.onBeforeStart) {
            log('dedicated-worker: running onBeforeStart');
            await options.onBeforeStart(config);
            log('dedicated-worker: onBeforeStart complete');
          }
          log('dedicated-worker: starting WorkerRuntime');
          await runtime.start();
          log('dedicated-worker: WorkerRuntime started, posting ready');
          self.postMessage({
            type: 'ready',
            livenessLockKey: runtime.livenessLockKey,
          } satisfies DedicatedWorkerMessage);
          break;
        }
        case 'start-session': {
          if (tabsProcessed.has(message.clientId)) {
            log('ignoring duplicate client', { clientId: message.clientId });
            break;
          }
          tabsProcessed.add(message.clientId);

          const appChannel = new MessageChannel();
          const systemChannel = new MessageChannel();

          log('dedicated-worker: posting session ports', { clientId: message.clientId });
          self.postMessage(
            {
              type: 'session',
              appPort: appChannel.port1,
              systemPort: systemChannel.port1,
              clientId: message.clientId,
            } satisfies DedicatedWorkerMessage,
            [appChannel.port1, systemChannel.port1],
          );

          // Will block until the other side finishes the handshake.
          {
            log('dedicated-worker: creating session (waiting for handshake)', { clientId: message.clientId });
            const session = await runtime.createSession({
              systemPort: createWorkerPort({ port: systemChannel.port2 }),
              appPort: createWorkerPort({ port: appChannel.port2 }),
              onClose: async () => {
                log('dedicated-worker: session closed', { clientId: message.clientId });
                tabsProcessed.delete(message.clientId);
              },
            });
            log('dedicated-worker: session created', { clientId: message.clientId });
            if (message.clientId === owningClientId) {
              log('dedicated-worker: connecting webrtc bridge to owning client', { clientId: message.clientId });
              runtime.connectWebrtcBridge(session);
            }
          }
          break;
        }

        default:
          log.error('unknown message', { type: (message as any).type });
      }
    };

    self.addEventListener('message', handleMessage);
    self.postMessage({
      type: 'listening',
    } satisfies DedicatedWorkerMessage);

    await lockPromise;
    self.removeEventListener('message', handleMessage);
  });
};
