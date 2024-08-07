//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { mountDevtoolsHooks } from '../devtools';
import { LOCK_KEY } from '../lock-key';

TRACE_PROCESSOR.setInstanceTag('shared-worker');

let releaseLock: () => void;
const lockPromise = new Promise<void>((resolve) => (releaseLock = resolve));
const lockAcquired = new Trigger();
void navigator.locks.request(LOCK_KEY, (lock) => {
  lockAcquired.wake();
  return lockPromise;
});

const setupRuntime = async () => {
  const { WorkerRuntime } = await import('@dxos/client-services');

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

  return workerRuntime;
};

const workerRuntimePromise = setupRuntime();

const start = Date.now();
void workerRuntimePromise
  .then((workerRuntime) => workerRuntime.start())
  .then(
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

  // set log configuration forwarded from localStorage setting
  // TODO(nf): block worker initialization until this is set? we usually win the race.
  port.onmessage = (event) => {
    (globalThis as any).localStorage_dxlog = event.data.dxlog;
  };
  // NOTE: This is intentiontally not using protobuf because it occurs before the rpc connection is established.
  port.postMessage(
    {
      command: 'init',
      payload: {
        systemPort: systemChannel.port1,
        appPort: appChannel.port1,
      },
    },
    [systemChannel.port1, appChannel.port1],
  );

  const workerRuntime = await workerRuntimePromise;
  await workerRuntime.createSession({
    systemPort: createWorkerPort({ port: systemChannel.port2 }),
    appPort: createWorkerPort({ port: appChannel.port2 }),
  });
};

export const getWorkerServiceHost = async () => (await workerRuntimePromise).host;
