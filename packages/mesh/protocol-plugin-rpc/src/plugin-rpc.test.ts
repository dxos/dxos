//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPeer, createRpcServer, createRpcClient, RpcPort, ProtoRpcClient } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { PluginRpc } from './plugin-rpc';
import { schema } from './proto/gen';
import { Test } from './proto/gen/dxos/rpc/test';

const createPeer = (topic: PublicKey, peerId: PublicKey, onConnect: (port: RpcPort) => void) => {
  const networkManager = new NetworkManager();
  afterTest(() => networkManager.destroy());
  const plugin = new PluginRpc(async (port) => {
    onConnect(port);
    return () => {};
  });
  networkManager.joinProtocolSwarm({
    topic,
    peerId,
    protocol: createProtocolFactory(
      topic,
      peerId,
      [plugin]
    ),
    topology: new StarTopology(topic)
  });
  return { plugin, networkManager };
};

describe('Protocol plugin rpc', () => {
  it('Works with rpc port', async () => {
    const topic = PublicKey.random();
    const clientId = PublicKey.random();
    let serverPort: RpcPort | undefined;
    let clientPort: RpcPort | undefined;
    const connected = new Event();
    const serverConnected = connected.waitFor(() => !!clientPort);
    const clientConnected = connected.waitFor(() => !!serverPort);

    const { plugin: server } = createPeer(topic, topic, (port) => {
      serverPort = port;
      connected.emit();
    });
    const { plugin: client } = createPeer(topic, clientId, (port) => {
      clientPort = port;
      connected.emit();
    });
    await Promise.all([serverConnected, clientConnected]);
    assert(serverPort);
    assert(clientPort);

    const message = PublicKey.random().asUint8Array();
    let receivedMessage: Uint8Array | undefined;

    serverPort.subscribe((msg) => {
      receivedMessage = msg;
    });
    await clientPort.send(message);

    await waitForExpect(() => {
      expect(receivedMessage && Buffer.from(receivedMessage).equals(message));
    });

    await client.close();
    await server.close();
  });

  it('Works with protobuf service', async () => {
    const service = schema.getService('dxos.rpc.test.Test');
    const topic = PublicKey.random();
    const clientId = PublicKey.random();
    const connected = new Event();
    let server: RpcPeer | undefined;
    let client: ProtoRpcClient<Test> | undefined;
    const serverConnected = connected.waitFor(() => !!server);
    const clientConnected = connected.waitFor(() => !!client);

    createPeer(topic, topic, async (port) => {
      server = createRpcServer({
        service,
        handlers: {
          TestCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return { data: 'responseData' };
          },
          VoidCall: async () => {}
        },
        port
      });
      await server.open();
      connected.emit();
    });
    createPeer(topic, clientId, async (port) => {
      client = createRpcClient(service, { port });
      await client.open();
      connected.emit();
    });

    await Promise.all([serverConnected, clientConnected]);
    assert(client);

    const response = await client.rpc.TestCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });
});
