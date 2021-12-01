//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { waitForCondition } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPort } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { PluginRpcClient } from './plugin-rpc-client';
import { PluginRpcServer } from './plugin-rpc-server';

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
  it('Sends a message via port', async () => {
    const topic = PublicKey.random();
    const { networkManager: nms } = createServerPeer(topic, (port) => {
      serverPort = port;
    });
    const { plugin: client, networkManager: nmc } = createClientPeer(topic);
    let serverPort: RpcPort | undefined;
    const clientPort = client.getRpcPort();
    await waitForCondition(() => !!serverPort);
    assert(serverPort);

    const message = PublicKey.random().asUint8Array();
    let receivedMessage: Uint8Array | undefined;

    serverPort.subscribe((msg) => {
      receivedMessage = msg;
    });
    await clientPort.send(message);

    await waitForExpect(() => {
      expect(receivedMessage).toEqual(message);
    });

    await Promise.all([nmc.destroy(), nms.destroy()]);
  });
});
