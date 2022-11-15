import { Config } from "@dxos/config";
import { createLinkedPorts } from "@dxos/rpc";
import { ClientServicesProxy, IFrameRuntime, WorkerRuntime } from "@dxos/client-services";
import { Client } from "../client";

describe('WorkerRuntime', () => {
  it('client connects to the worker', async () => {
    const workerRuntime = new WorkerRuntime(() => new Config({}));

    const systemPorts = createLinkedPorts();
    const workerProxyPorts = createLinkedPorts();
    const proxyWindowPorts = createLinkedPorts();
    void workerRuntime.createSession({
      systemPort: systemPorts[1],
      appPort: workerProxyPorts[1],
    })
    const clientProxy = new IFrameRuntime({
      systemPort: systemPorts[0],
      windowAppPort: proxyWindowPorts[0],
      workerAppPort: workerProxyPorts[0]
    })
    const client = new Client({
      services: new ClientServicesProxy(proxyWindowPorts[1])
    })
    
    await Promise.all([
      workerRuntime.start(),
      clientProxy.open('*'),
      client.initialize()
    ]) 

    await client.halo.createProfile()
  })
});