//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { WorkerRuntime } from '@dxos/client-services';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { mountDevtoolsHooks } from '../devtools';
import { LOCK_KEY } from '../lock-key';

let releaseLock: () => void;
const lockPromise = new Promise<void>((resolve) => (releaseLock = resolve));
const lockAcquired = new Trigger();
void navigator.locks.request(LOCK_KEY, (lock) => {
  lockAcquired.wake();
  return lockPromise;
});

const workerRuntime = new WorkerRuntime(
  async () => {
    const config = new Config(await Storage(), Envs(), Local(), Defaults());
    log.config({ filter: config.get('runtime.client.log.filter'), prefix: config.get('runtime.client.log.prefix') });
    return config;
  },
  {
    acquireLock: () => lockAcquired.wait(),
    releaseLock: () => releaseLock(),
    onReset: async () => {
      // Close the shared worker, lock will be released automatically.
      self.close();
    },
  },
);

// Allow to access host from console.
mountDevtoolsHooks({
  host: workerRuntime.host,
});

const start = Date.now();
void workerRuntime.start().then(
  () => {
    log.info('worker ready', { initTimeMs: Date.now() - start });
  },
  (err) => {
    log.catch(err);
  },
);

export const onconnect = async (event: MessageEvent<any>) => {
  log.info('onconnect', { event });
  const port = event.ports[0];

  const systemChannel = new MessageChannel();
  const appChannel = new MessageChannel();

  port.onmessage = (event: MessageEvent<WorkerMessage>) => {
    switch (event.data.command) {
      case 'close': {
        queueMicrotask(async () => {
          // Acquire a lock and send the lock name to the app.
          // This way the app can be sure that the worker is terminated.
          const lockName = crypto.randomUUID();
          await new Promise<void>((resolve) => {
            void navigator.locks.request(lockName, () => {
              resolve();
              return new Promise(() => {}); // Hold the lock until the worker is terminated.
            });
          });

          port.postMessage({ command: 'bequest', lockName } satisfies WorkerMessage);

          // Terminate the worker.
          globalThis.close();
        });
        break;
      }
      case undefined: {
        // TODO(dmaretskyi): Add command for this.
        // set log configuration forwarded from localStorage setting
        // TODO(nf): block worker initialization until this is set? we usually win the race.
        (globalThis as any).localStorage_dxlog = event.data.dxlog;
        break;
      }
      default: {
        log.warn('unknown message', { message: event.data });
      }
    }
  };
  // NOTE: This is intentiontally not using protobuf because it occurs before the rpc connection is established.
  port.postMessage(
    {
      command: 'init',
      payload: {
        systemPort: systemChannel.port1,
        appPort: appChannel.port1,
      },
    } satisfies WorkerMessage,
    [systemChannel.port1, appChannel.port1],
  );

  await workerRuntime.createSession({
    systemPort: createWorkerPort({ port: systemChannel.port2 }),
    appPort: createWorkerPort({ port: appChannel.port2 }),
  });
};

type WorkerMessage =
  | {
      command: 'init';
      payload: {
        systemPort: MessagePort;
        appPort: MessagePort;
      };
    }
  | {
      // Request to close the worker.
      command: 'close';
    }
  | {
      // Worker sends this to as a response to the 'close' command.
      command: 'bequest';
      /**
       * Name of the lock that was briefly acquired by the worker.
       * When the lock is released, the worker app can be sure that the worker is terminated.
       */
      lockName: string;
    }
  | {
      command: undefined;
      dxlog: string;
    };
