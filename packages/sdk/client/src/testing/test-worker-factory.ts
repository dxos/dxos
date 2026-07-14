//
// Copyright 2026 DXOS.org
//

import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../lock-key';

/**
 * In-thread worker for testing purposes.
 * Creates a WorkerRuntime in the same thread using MessageChannel for communication.
 */
export class TestWorkerFactory extends Resource {
  constructor(private readonly _config?: Config) {
    super();
  }

  /**
   * Creates a new MessagePort connected to the worker runtime.
   */
  make(): MessagePort {
    log('worker-entrypoint');
    const messageChannel = new MessageChannel();
    // Worker.run listens via addEventListener, which (unlike assigning onmessage) does not implicitly
    // start the port, so dispatch it explicitly rather than relying on the host's auto-start.
    messageChannel.port1.start();

    Worker.run({
      endpoint: {
        postMessage: (message, transfer) =>
          messageChannel.port1.postMessage(message, transfer ? { transfer } : undefined),
        addEventListener: (type, listener) => messageChannel.port1.addEventListener(type, listener as EventListener),
        removeEventListener: (type, listener) =>
          messageChannel.port1.removeEventListener(type, listener as EventListener),
        close: () => messageChannel.port1.close(),
      },
      storageLockKey: STORAGE_LOCK_KEY,
      createRuntime: ({ config: configValues, requestShutdown }) =>
        Effect.promise(async () => {
          const runtime = new WorkerRuntime({
            configProvider: async () => this._config ?? new Config(configValues ?? {}),
            onStop: async () => {
              messageChannel.port1.close();
              requestShutdown();
            },
            acquireLock: async () => {},
            releaseLock: () => {},
            automaticallyConnectWebrtc: false,
            sqliteLayer: sqliteLayerMemory,
          });
          await runtime.start();
          this._ctx.onDispose(() => runtime.stop());

          return {
            stop: async () => runtime.stop(),
            // The framework hands the session its protocol layers via effect context. The WorkerRuntime
            // session manages its own lifecycle, so the effect opens the session then blocks — the
            // framework runs it for the session's lifetime.
            createSession: ({ isOwner }) =>
              Effect.gen(function* () {
                const appProtocol = yield* RpcServer.Protocol;
                const systemProtocol = yield* RpcClient.Protocol;
                const session = yield* Effect.promise(() => runtime.createSession({ appProtocol, systemProtocol }));
                if (isOwner) {
                  runtime.connectWebrtcBridge(session);
                }
                return yield* Effect.never;
              }),
          };
        }),
    });

    return messageChannel.port2;
  }
}
