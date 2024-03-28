//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { sleep } from '@dxos/async';
import { SharedWorkerConnection, WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createLinkedPorts } from '@dxos/rpc';
import { describe, test, afterTest } from '@dxos/test';
import { type MaybePromise, type Provider } from '@dxos/util';

import { Client } from '../client';
import { ClientServicesProxy, fromIFrame } from '../services';
import { TestBuilder } from '../testing';

chai.use(chaiAsPromised);

// TODO(burdon): Flaky: https://cloud.nx.app/runs/7BZ7WKaZPA
const setup = (getConfig: Provider<MaybePromise<Config>>) => {
  const workerRuntime = new WorkerRuntime(getConfig, {
    acquireLock: async () => {
      // No-op.
    },
    releaseLock: () => {
      // No-op.
    },
    onReset: async () => {
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
    config: getConfig,
    systemPort: systemPorts[0],
    shellPort: shellPorts[0],
  });
  const client = new Client({
    services: new ClientServicesProxy(appPorts[0]),
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

    await expect(client.initialize()).to.be.rejectedWith('Test error');

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

  // TODO(burdon): Browser-only.
  test.skip('creates client with remote iframe', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({
      services: fromIFrame(testBuilder.config),
    });

    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });
});
