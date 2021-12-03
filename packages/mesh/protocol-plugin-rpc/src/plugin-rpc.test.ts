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

const createPeer = (
  topic: PublicKey,
  peerId: PublicKey,
  onConnect: (port: RpcPort, peerId: string) => void
) => {
  const networkManager = new NetworkManager();
  afterTest(() => networkManager.destroy());
  const plugin = new PluginRpc(async (port, peerId) => {
    onConnect(port, peerId);
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
      connected.emit();
    });
    createPeer(topic, clientId, async (port) => {
      client = createRpcClient(service, { port });
      connected.emit();
    });

    await Promise.all([
      serverConnected,
      clientConnected
    ]);
    assert(client);
    assert(server);
    await Promise.all([
      server.open(),
      client.open()
    ]);

    const response = await client.rpc.TestCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });

  it('One server two clients', async () => {
    const service = schema.getService('dxos.rpc.test.Test');
    const topic = PublicKey.random();
    const client1Id = PublicKey.random();
    const client2Id = PublicKey.random();
    const connected = new Event();
    let client1: ProtoRpcClient<Test> | undefined;
    let client2: ProtoRpcClient<Test> | undefined;
    const client1Connected = connected.waitFor(() => !!client1);
    const client2Connected = connected.waitFor(() => !!client2);

    createPeer(topic, topic, (port, peerId) => {
      const server = createRpcServer({
        service,
        handlers: {
          TestCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return { data: peerId };
          },
          VoidCall: async () => {}
        },
        port
      });
      // The callback needs to finish before the port can be opened?
      setTimeout(() => server.open(), 0);
    });
    
    createPeer(topic, client1Id, async (port) => {
      client1 = createRpcClient(service, { port });
      // The callback needs to finish before the port can be opened?
      setTimeout(async () => {
        await client1!.open();
        connected.emit();
      }, 0);
    });
    createPeer(topic, client2Id, async (port) => {
      client2 = createRpcClient(service, { port });
      // The callback needs to finish before the port can be opened?
      setTimeout(async () => {
        await client2!.open();
        connected.emit();
      }, 0);
    });

    await Promise.all([
      client1Connected,
      client2Connected
    ]);
    assert(client1);
    assert(client2);

    const responses = await Promise.all([
      client1.rpc.TestCall({ data: 'requestData' }),
      client2.rpc.TestCall({ data: 'requestData' }),
      client1.rpc.TestCall({ data: 'requestData' }),
    ]);

    const peerIds = responses.map((response) => response.data);
    expect(peerIds[0]).toEqual(peerIds[2]);
    expect(peerIds[0]).not.toEqual(peerIds[1]);
  });
});
