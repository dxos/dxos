//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client, ClientServicesProxy, SharedWorkerConnection } from '@dxos/client';
import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createLinkedPorts } from '@dxos/rpc';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';
import { type MaybePromise, type Provider } from '@dxos/util';

const setup = (configProvider: Provider<MaybePromise<Config>>) => {
  const workerRuntime = new WorkerRuntime({
    configProvider,
    acquireLock: async () => {
      // No-op.
    },
    releaseLock: () => {
      // No-op.
    },
    onStop: async () => {
      // No-op.
    },
    // Use in-memory SQLite for testing instead of OPFS which only works in browsers.
    sqliteLayer: sqliteLayerMemory,
  });

  const systemPorts = createLinkedPorts();
  const appChannel = new MessageChannel();
  const shellChannel = new MessageChannel();
  void workerRuntime.createSession({
    systemPort: systemPorts[1],
    appPort: appChannel.port2,
    shellPort: shellChannel.port2,
  });
  const clientProxy = new SharedWorkerConnection({
    config: configProvider,
    systemPort: systemPorts[0],
  });
  const client = new Client({
    services: new ClientServicesProxy(appChannel.port1),
  });
  onTestFinished(async () => {
    await client.destroy();
    await clientProxy.close().catch(() => {});
    await workerRuntime.stop();
  });

  return { workerRuntime, clientProxy, client };
};

describe('Shared worker', () => {
  test('client connects to the worker', async () => {
    const { workerRuntime, clientProxy, client } = setup(() => new Config({}));

    await Promise.all([workerRuntime.start(), clientProxy.open({ origin: '*' }), client.initialize()]);

    await client.halo.createIdentity();
  });

  test('initialization errors get propagated to the client', async () => {
    const { workerRuntime, clientProxy, client } = setup(async () => {
      await sleep(1);
      throw new Error('Test error');
    });

    const promise = Promise.all([
      // This error should be propagated to client.initialize() call.
      workerRuntime.start().catch(() => {}),
      clientProxy.open({ origin: '*' }).catch(() => {}),
    ]);

    await expect(client.initialize()).rejects.toThrowError('Test error');

    await promise;
  });

  test('host can be initialized after client', async () => {
    const { workerRuntime, clientProxy, client } = setup(async () => {
      await sleep(5);
      return new Config({});
    });

    await Promise.all([workerRuntime.start(), clientProxy.open({ origin: '*' }), client.initialize()]);

    await client.halo.createIdentity();
  });
});
