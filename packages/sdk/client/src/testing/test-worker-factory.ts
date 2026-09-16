//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { makeWorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';
import * as Worker from '@dxos/worker-framework/Worker';

import { STORAGE_LOCK_KEY } from '../lock-key.ts';

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
        Effect.gen({ self: this }, function* () {
          const runtime = yield* makeWorkerRuntime({
            configProvider: Effect.sync(() => this._config ?? new Config(configValues ?? {})),
            requestShutdown: Effect.sync(requestShutdown),
            automaticallyConnectWebrtc: false,
            sqliteLayer: sqliteLayerMemory,
          });
          this._ctx.onDispose(() => requestShutdown());

          return {
            // The framework hands the session its protocol layers via effect context and owns its lifetime.
            createSession: ({ isOwner }) =>
              Effect.gen(function* () {
                const appProtocol = yield* RpcServer.Protocol;
                const systemProtocol = yield* RpcClient.Protocol;
                const session = yield* runtime.createSession({ appProtocol, systemProtocol });
                if (isOwner) {
                  yield* runtime.connectWebrtc(session);
                }
              }),
          };
        }),
    });

    return messageChannel.port2;
  }
}
