//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { createPeer, TEST_SIGNAL_URL } from '../testing';
import { StarTopology } from '../topology';
import { createWebRTCTransportFactory, WebRTCTransportProxyFactory, WebRTCTransportService } from '../transport';
import { testSuite } from './test-suite';

// TODO(burdon): log.catch prints error message twice.
//  E RPC has not been opened. Error: RPC has not been opened.

describe
  .skip('WebRTC transport', async function () {
    let topic: PublicKey;
    let peer1Id: PublicKey;
    let peer2Id: PublicKey;

    beforeEach(function () {
      topic = PublicKey.random();
      peer1Id = PublicKey.random();
      peer2Id = PublicKey.random();
    });

    testSuite({
      signalUrl: TEST_SIGNAL_URL,
      getTransportFactory: async () => createWebRTCTransportFactory()
    });

    // TODO(burdon): Factor out config and remove consts.
    it.skip('two peers with different signal & turn servers', async function () {
      const { networkManager: networkManager1, plugin: plugin1 } = await createPeer({
        topic,
        peerId: peer1Id,
        signalHosts: ['wss://apollo3.kube.moon.dxos.network/dxos/signal'],
        transportFactory: createWebRTCTransportFactory({
          iceServers: {
            urls: 'turn:apollo3.kube.moon.dxos.network:3478',
            username: 'dxos',
            credential: 'dxos'
          }
        })
      });

      await sleep(3000);
      const { networkManager: networkManager2, plugin: plugin2 } = await createPeer({
        topic,
        peerId: peer2Id,
        signalHosts: ['wss://apollo2.kube.moon.dxos.network/dxos/signal'],
        transportFactory: createWebRTCTransportFactory({
          iceServers: {
            urls: 'turn:apollo2.kube.moon.dxos.network:3478',
            username: 'dxos',
            credential: 'dxos'
          }
        })
      });

      const received: any[] = [];
      const mockReceive = (p: Protocol, s: string) => {
        received.push(p, s);
        return undefined;
      };

      plugin1.on('receive', mockReceive);
      plugin2.on('connect', async () => {
        await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
      });

      await waitForExpect(() => {
        expect(received.length).toBe(2);
        expect(received[0]).toBeInstanceOf(Protocol);
        expect(received[1]).toBe('{"message": "Hello"}');
      });

      await networkManager1.close();
      await networkManager2.close();
    }).timeout(10_000);

    describe('StarTopology', function () {
      it('two peers connect to each other', async function () {
        const { plugin: plugin1 } = await createPeer({
          topic,
          peerId: peer1Id,
          topology: new StarTopology(peer1Id),
          transportFactory: createWebRTCTransportFactory()
        });
        const { plugin: plugin2 } = await createPeer({
          topic,
          peerId: peer2Id,
          topology: new StarTopology(peer1Id),
          transportFactory: createWebRTCTransportFactory()
        });

        const received: any[] = [];
        const mockReceive = (p: Protocol, s: string) => {
          received.push(p, s);
          return undefined;
        };

        plugin1.on('receive', mockReceive);
        plugin2.on('connect', async () => {
          await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
        });

        await waitForExpect(() => {
          expect(received.length).toBe(2);
          expect(received[0]).toBeInstanceOf(Protocol);
          expect(received[1]).toBe('{"message": "Hello"}');
        });
      }).timeout(10_000);
    });
  })
  .timeout(10_000);

// TODO(burdon): Skipped.
describe.skip('WebRTC proxy transport', function () {
  // TODO(burdon): Move into TestBuilder.
  const createTransportFactory = async () => {
    const [rpcPortA, rpcPortB] = createLinkedPorts();

    const webRTCTransportService: BridgeService = new WebRTCTransportService();
    const service = createProtoRpcPeer({
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      handlers: { BridgeService: webRTCTransportService },
      port: rpcPortA,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });

    const rpcClient = createProtoRpcPeer({
      requested: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      port: rpcPortB,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });

    await service.open();
    afterTest(() => service.close());
    await rpcClient.open();
    afterTest(() => rpcClient.close());

    return new WebRTCTransportProxyFactory().setBridgeService(rpcClient.rpc.BridgeService);
  };

  testSuite({
    signalUrl: TEST_SIGNAL_URL,
    getTransportFactory: createTransportFactory
  });
});
