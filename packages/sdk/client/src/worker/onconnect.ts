//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { type Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { mountDevtoolsHooks } from '../devtools';
import { STORAGE_LOCK_KEY } from '../lock-key';

TRACE_PROCESSOR.setInstanceTag('shared-worker');

let releaseLock: () => void;
const lockPromise = new Promise<void>((resolve) => (releaseLock = resolve));
const lockAcquired = new Trigger();
void navigator.locks.request(STORAGE_LOCK_KEY, (_lock: Lock | null) => {
  lockAcquired.wake();
  return lockPromise;
});

// Config supplied by the first connecting client. Used as an overlay on top of the worker's own
// Storage/Envs/Local/Defaults so fields like observabilityGroup (sourced from localStorage in the
// app) can reach the worker without RPC parameter threading.
const clientConfigOverlay = new Trigger<ConfigProto | undefined>();

const setupRuntime = async () => {
  const { WorkerRuntime } = await import('@dxos/client-services');

  const workerRuntime = new WorkerRuntime({
    configProvider: async () => {
      const overlay = await clientConfigOverlay.wait();
      const config = new Config(overlay ?? {}, await Storage(), Envs(), Local(), Defaults());
      log.config({ filter: config.get('runtime.client.log.filter'), prefix: config.get('runtime.client.log.prefix') });
      return config;
    },
    acquireLock: () => lockAcquired.wait(),
    releaseLock: () => releaseLock(),
    onStop: async () => {
      // Close the shared worker, lock will be released automatically.
      self.close();
    },
    // TODO(mykola): OPFS SQLite doesn't work in Shared worker.
    sqliteLayer: layerMemory,
  });

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

  // Set log configuration forwarded from localStorage setting and receive client config overlay.
  // TODO(nf): block worker initialization until this is set? we usually win the race.
  port.onmessage = (event) => {
    (globalThis as any).localStorage_dxlog = event.data.dxlog;
    // NOTE: Trigger.wake is a NOOP once resolved; only the first client seeds the overlay.
    clientConfigOverlay.wake(event.data.config);
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
