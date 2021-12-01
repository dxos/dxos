//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { waitForCondition } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPeer, createRpcServer, createRpcClient, RpcPort } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { PluginRpcClient } from './plugin-rpc-client';
import { PluginRpcServer } from './plugin-rpc-server';
import { schema } from './proto/gen';

const createClientPeer = (topic: PublicKey) => {
  const networkManager = new NetworkManager();
  afterTest(() => networkManager.destroy());
  const plugin = new PluginRpcClient();
  const peerId = PublicKey.random();
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

const createServerPeer = (topic: PublicKey, onConnect: (port: RpcPort) => void) => {
  const networkManager = new NetworkManager();
  afterTest(() => networkManager.destroy());
  const plugin = new PluginRpcServer(async (port) => {
    onConnect(port);
    return () => {};
  });
  networkManager.joinProtocolSwarm({
    topic,
    peerId: topic,
    protocol: createProtocolFactory(
      topic,
      topic,
      [plugin]
    ),
    topology: new StarTopology(topic)
  });
  return { plugin, networkManager };
};

describe('Protocol plugin rpc', () => {
  it('Works with rpc port', async () => {
    const topic = PublicKey.random();
    let serverPort: RpcPort | undefined;
    const { plugin: server } = createServerPeer(topic, (port) => {
      serverPort = port;
    });
    const { plugin: client } = createClientPeer(topic);
    const clientPort = await client.getRpcPort();
    await waitForCondition(() => !!serverPort);
    assert(serverPort);

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
    const service = schema.getService('dxos.rpc.test.TestService');
    const topic = PublicKey.random();
  
    let server: RpcPeer | undefined;
    createServerPeer(topic, (port) => {
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
    });
    const { plugin: clientPeer } = createClientPeer(topic);
    const clientPort = await clientPeer.getRpcPort();

    const client = createRpcClient(service, {
      port: clientPort
    });

    await waitForCondition(() => !!server);
    assert(server);

    await Promise.all([
      server.open(),
      client.open()
    ]);

    const response = await client.rpc.TestCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });
});
