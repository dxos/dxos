//
// Copyright 2024 DXOS.org
//

import localforage from 'localforage';

import { Trigger } from '@dxos/async';
import { WorkerRuntime } from '@dxos/client-services';
import { Config, type ConfigProto, Defaults, Envs, Local } from '@dxos/config';
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
    const storageConfig = await loadStorageConfig();
    const config = new Config(storageConfig, Envs(), Local(), Defaults());
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

  await workerRuntime.createSession({
    systemPort: createWorkerPort({ port: systemChannel.port2 }),
    appPort: createWorkerPort({ port: appChannel.port2 }),
  });
};

const loadStorageConfig = async (): Promise<ConfigProto> => {
  // NOTE: Load the configuration which is set in `plugin-client` settings
  try {
    const storageAdapterOption = await localforage.getItem<number>('dxos.org/settings/storage-driver');
    if (storageAdapterOption) {
      return { runtime: { client: { storage: { dataStore: storageAdapterOption } } } };
    }
  } catch (err) {
    log.warn('Failed to load storage-adapter option', { err });
  }
  return {};
};
