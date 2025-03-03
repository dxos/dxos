//
// Copyright 2022 DXOS.org
//

import { describe, expect, test, onTestFinished } from 'vitest';

import { sleep } from '@dxos/async';
import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createLinkedPorts } from '@dxos/rpc';
import { type MaybePromise, type Provider } from '@dxos/util';

import { Client } from '../client';
import { ClientServicesProxy, SharedWorkerConnection } from '../services';

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
  });

  const systemPorts = createLinkedPorts();
  const appPorts = createLinkedPorts();
  const shellPorts = createLinkedPorts();
  void workerRuntime.createSession({
    systemPort: systemPorts[1],
    appPort: appPorts[1],
    shellPort: shellPorts[1],
  });
  const clientProxy = new SharedWorkerConnection({
    config: configProvider,
    systemPort: systemPorts[0],
    shellPort: shellPorts[0],
  });
  const client = new Client({
    services: new ClientServicesProxy(appPorts[0]),
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
