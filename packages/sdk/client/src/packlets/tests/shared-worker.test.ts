//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { sleep } from '@dxos/async';
import { ClientServicesProxy, IFrameRuntime, WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createLinkedPorts } from '@dxos/rpc';

import { Client } from '../client';

describe('WorkerRuntime', function () {
  it('client connects to the worker', async function () {
    const workerRuntime = new WorkerRuntime(() => new Config({}));

    const systemPorts = createLinkedPorts();
    const workerProxyPorts = createLinkedPorts();
    const proxyWindowPorts = createLinkedPorts();
    void workerRuntime.createSession({
      systemPort: systemPorts[1],
      appPort: workerProxyPorts[1]
    });
    const clientProxy = new IFrameRuntime({
      systemPort: systemPorts[0],
      windowAppPort: proxyWindowPorts[0],
      workerAppPort: workerProxyPorts[0]
    });
    const client = new Client({
      services: new ClientServicesProxy(proxyWindowPorts[1])
    });

    await Promise.all([workerRuntime.start(), clientProxy.open('*'), client.initialize()]);

    await client.halo.createProfile();
  });

  it('initialization errors get propagated to the client', async function () {
    const workerRuntime = new WorkerRuntime(async () => {
      await sleep(1);
      throw new Error('Test error');
    });

    const systemPorts = createLinkedPorts();
    const workerProxyPorts = createLinkedPorts();
    const proxyWindowPorts = createLinkedPorts();
    void workerRuntime.createSession({
      systemPort: systemPorts[1],
      appPort: workerProxyPorts[1]
    });
    const clientProxy = new IFrameRuntime({
      systemPort: systemPorts[0],
      windowAppPort: proxyWindowPorts[0],
      workerAppPort: workerProxyPorts[0]
    });
    const client = new Client({
      services: new ClientServicesProxy(proxyWindowPorts[1])
    });

    const promise = Promise.all([
      workerRuntime.start().catch(() => {}), // This error should be propagated to client.initialize() call.
      clientProxy.open('*')
    ]);

    await expect(client.initialize()).rejects.toEqual(new Error('Test error'));

    await promise;
  });
});
