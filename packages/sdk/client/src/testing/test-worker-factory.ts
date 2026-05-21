//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { layerFile } from '@dxos/sql-sqlite/platform';

import { STORAGE_LOCK_KEY } from '../lock-key';
import type { DedicatedWorkerMessage } from '../services/dedicated/types';

/**
 * In-thread worker for testing purposes.
 * Creates a WorkerRuntime in the same thread using MessageChannel for communication.
 * Uses a shared file-based storage directory so all data (identity, spaces) persists
 * across leader changes, mirroring production behavior.
 */
export class TestWorkerFactory extends Resource {
  readonly #storageDir: string;
  readonly #sqliteFile: string;

  constructor(private readonly _config?: Config) {
    super();
    this.#storageDir = path.join(os.tmpdir(), `dxos-test-worker-${crypto.randomUUID()}`);
    this.#sqliteFile = path.join(this.#storageDir, 'echo.sqlite');
    fs.mkdirSync(this.#storageDir, { recursive: true });
  }

  protected override async _close(): Promise<void> {
    fs.rmSync(this.#storageDir, { recursive: true, force: true });
  }

  /**
   * Creates a new MessagePort connected to the worker runtime.
   */
  make(): MessagePort {
    log('worker-entrypoint');
    const messageChannel = new MessageChannel();

    let runtime: WorkerRuntime | undefined;
    /**
     * Client that owns the worker.
     */
    let owningClientId: string;

    const tabsProcessed = new Set<string>();

    // Lock release mechanism - holds the lock until runtime stops.
    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Proxy port2 to intercept close() and stop the runtime.
    // In production, when a Worker is terminated, the browser automatically releases
    // all navigator.locks it holds. This proxy simulates that behavior for the
    // in-thread test worker by triggering runtime.stop() when close() is called.
    const proxyPort = new Proxy(messageChannel.port2, {
      get(target, prop, _receiver) {
        if (prop === 'close') {
          return () => {
            target.close();
            void runtime?.stop();
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? (value as Function).bind(target) : value;
      },
      set(target, prop, value) {
        (target as any)[prop] = value;
        return true;
      },
    });

    // Lock ensures only a single worker is running.
    void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
      messageChannel.port1.onmessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
        log('worker got message', { type: ev.data.type });
        switch (ev.data.type) {
          case 'init': {
            owningClientId = ev.data.ownerClientId ?? ev.data.clientId;
            runtime = new WorkerRuntime({
              configProvider: async () => {
                return new Config({
                  version: 1,
                  runtime: {
                    client: {
                      storage: {
                        persistent: true,
                        dataRoot: this.#storageDir,
                      },
                    },
                  },
                });
              },
              onStop: async () => {
                // Close the port and release the lock.
                messageChannel.port1.close();
                releaseLock();
              },
              // TODO(dmaretskyi): We should split the storage lock and liveness. Keep storage lock fully inside WorkerRuntime, while liveness stays outside.
              acquireLock: async () => {},
              releaseLock: () => {},
              automaticallyConnectWebrtc: false,
              // Use a shared file-based SQLite so data persists across leader changes,
              // matching production OPFS behavior.
              sqliteLayer: layerFile(this.#sqliteFile),
            });
            await runtime.start();
            this._ctx.onDispose(() => runtime!.stop());
            messageChannel.port1.postMessage({
              type: 'ready',
              livenessLockKey: runtime.livenessLockKey,
            } satisfies DedicatedWorkerMessage);
            break;
          }
          case 'start-session': {
            if (tabsProcessed.has(ev.data.clientId)) {
              log('ignoring duplicate client');
              break;
            }
            tabsProcessed.add(ev.data.clientId);

            const appChannel = new MessageChannel();
            const systemChannel = new MessageChannel();

            messageChannel.port1.postMessage(
              {
                type: 'session',
                appPort: appChannel.port1,
                systemPort: systemChannel.port1,
                clientId: ev.data.clientId,
              } satisfies DedicatedWorkerMessage,
              [appChannel.port1, systemChannel.port1],
            );

            // Will block until the other side finishes the handshake.
            {
              const session = await runtime!.createSession({
                systemPort: createWorkerPort({ port: systemChannel.port2 }),
                appPort: createWorkerPort({ port: appChannel.port2 }),
              });
              if (ev.data.clientId === owningClientId) {
                runtime!.connectWebrtcBridge(session);
              }
            }
            break;
          }

          default:
            log.error('unknown message', { type: ev.data });
        }
      };
      messageChannel.port1.postMessage({ type: 'listening' } satisfies DedicatedWorkerMessage);

      // Hold the lock until the runtime stops.
      await lockPromise;
    });

    return proxyPort;
  }
}
