//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import * as fc from 'fast-check';
import { ModelRunSetup } from 'fast-check';
import waitForExpect from 'wait-for-expect';

import { latch, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';
import { range, ComplexMap, ComplexSet } from '@dxos/util';

import { NetworkManager } from './network-manager';
import { sharedTests } from './network-manager-testsuite';
import { createProtocolFactory } from './protocol-factory';
import { createPeer, TEST_SIGNAL_URL, TestBuilder } from './testing';
import { FullyConnectedTopology, StarTopology } from './topology';
import {
  createWebRTCTransportFactory,
  MemoryTransportFactory,
  WebRTCTransportProxyFactory,
  WebRTCTransportService
} from './transport';

describe('NetworkManager', function () {
  describe('WebRTC transport', function () {
    // TODO(burdon): Skipped.
    return;
    let topic: PublicKey;
    let peer1Id: PublicKey;
    let peer2Id: PublicKey;

    beforeEach(function () {
      topic = PublicKey.random();
      peer1Id = PublicKey.random();
      peer2Id = PublicKey.random();
    });

    sharedTests({
      inMemory: false,
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

      await networkManager1.destroy();
      await networkManager2.destroy();
    }).timeout(10_000);

    describe('StarTopology', function () {
      it.only('two peers connect to each other', async function () {
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

        // TODO(burdon): Close.
      }).timeout(10_000);
    });
  }).timeout(10_000);

  describe.skip('WebRTC proxy transport', function () {
    // TODO(burdon): Skipped.
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

    sharedTests({
      inMemory: false,
      signalUrl: TEST_SIGNAL_URL,
      getTransportFactory: createTransportFactory
    });
  });

  describe('memory transport', function () {
    sharedTests({
      inMemory: true,
      getTransportFactory: async () => MemoryTransportFactory
    });

    it('many peers and connections', async function () {
      const numTopics = 5;
      const peersPerTopic = 5;

      await Promise.all(
        range(numTopics).map(async () => {
          const topic = PublicKey.random();

          await Promise.all(
            range(peersPerTopic).map(async (_, index) => {
              const peerId = PublicKey.random();
              const { plugin } = await createPeer({
                topic,
                peerId,
                transportFactory: MemoryTransportFactory
              });

              const [done, pongReceived] = latch({ count: peersPerTopic - 1 });

              plugin.on('connect', async (protocol: Protocol) => {
                const { peerId } = protocol.getSession() ?? {};
                const remoteId = PublicKey.from(peerId);
                await plugin.send(remoteId.asBuffer(), 'ping');
              });

              plugin.on('receive', async (protocol: Protocol, data: any) => {
                const { peerId } = protocol.getSession() ?? {};
                const remoteId = PublicKey.from(peerId);

                if (data === 'ping') {
                  await plugin.send(remoteId.asBuffer(), 'pong');
                } else if (data === 'pong') {
                  pongReceived();
                } else {
                  throw new Error(`Invalid message: ${data}`);
                }
              });

              await done();
            })
          );
        })
      );
    });

    // This test performs random actions in the real system and compares it's state with a simplified model.
    // TODO(dmaretskyi): Run this on with actual webrtc and signal servers.
    it('property-based tests', async function () {
      const testBuilder = new TestBuilder();

      /**
       * The simplified model of the system.
       */
      interface Model {
        topic: PublicKey;
        peers: ComplexSet<PublicKey>;
        joinedPeers: ComplexSet<PublicKey>;
      }

      /**
       * The real system being tested.
       */
      interface Real {
        peers: ComplexMap<
          PublicKey,
          {
            networkManager: NetworkManager;
            presence?: PresencePlugin;
          }
        >;
      }

      const assertState = async (model: Model, real: Real) => {
        await waitForExpect(() => {
          for (const peer of real.peers.values()) {
            if (peer.presence) {
              for (const expectedJoinedPeer of model.joinedPeers) {
                if (expectedJoinedPeer.equals(peer.presence.peerId)) {
                  continue;
                }

                const actuallyConnectedPeers = peer.presence!.peers;
                if (!actuallyConnectedPeers.some((x) => PublicKey.equals(expectedJoinedPeer, x))) {
                  throw new Error(
                    `Expected ${expectedJoinedPeer} to be in the list of joined peers of peer ${peer.presence.peerId.toString(
                      'hex'
                    )}, actually connected peers: ${actuallyConnectedPeers.map((key) => key.toString('hex'))}`
                  );
                }
              }
            }
          }
        }, 5_000);

        real.peers.forEach((peer) =>
          peer.networkManager.topics.forEach((topic) => {
            peer.networkManager.getSwarm(topic)!.errors.assertNoUnhandledErrors();
          })
        );
      };

      // TODO(burdon): Factor out to TestBuilder.

      class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
        constructor(readonly peerId: PublicKey) {}

        check = (model: Model) => !model.peers.has(this.peerId);
        async run(model: Model, real: Real) {
          model.peers.add(this.peerId);

          const networkManager = testBuilder.createNetworkManager();
          afterTest(() => networkManager.destroy());

          real.peers.set(this.peerId, {
            networkManager
          });

          await assertState(model, real);
        }

        toString = () => `CreatePeer(${this.peerId})`;
      }

      class RemovePeerCommand implements fc.AsyncCommand<Model, Real> {
        constructor(readonly peerId: PublicKey) {}

        check = (model: Model) => model.peers.has(this.peerId);
        async run(model: Model, real: Real) {
          model.peers.delete(this.peerId);
          model.joinedPeers.delete(this.peerId);

          const peer = real.peers.get(this.peerId);
          await peer!.networkManager.destroy();
          real.peers.delete(this.peerId);

          await assertState(model, real);
        }

        toString = () => `RemovePeer(${this.peerId})`;
      }

      class JoinTopicCommand implements fc.AsyncCommand<Model, Real> {
        constructor(readonly peerId: PublicKey) {}

        check = (model: Model) => model.peers.has(this.peerId) && !model.joinedPeers.has(this.peerId);
        async run(model: Model, real: Real) {
          model.joinedPeers.add(this.peerId);

          const peer = real.peers.get(this.peerId)!;

          const presence = new PresencePlugin(this.peerId.asBuffer());
          afterTest(() => presence.stop());
          const protocol = createProtocolFactory(model.topic, this.peerId, [presence]);

          await peer.networkManager.openSwarmConnection({
            peerId: this.peerId, // TODO(burdon): `this`?
            topic: model.topic,
            protocol,
            topology: new FullyConnectedTopology(),
            presence
          });

          peer.presence = presence;

          await assertState(model, real);
        }

        toString = () => `JoinTopic(peerId=${this.peerId})`;
      }

      class LeaveTopicCommand implements fc.AsyncCommand<Model, Real> {
        constructor(readonly peerId: PublicKey) {}

        check = (model: Model) => model.peers.has(this.peerId) && model.joinedPeers.has(this.peerId);
        async run(model: Model, real: Real) {
          model.joinedPeers.delete(this.peerId);

          const peer = real.peers.get(this.peerId)!;
          await peer.networkManager.closeSwarmConnection(model.topic);
          peer.presence = undefined;

          await assertState(model, real);
        }

        toString = () => `LeaveTopic(peerId=${this.peerId})`;
      }

      const peerIds = range(10).map(() => PublicKey.random());
      const peerId1 = fc.constantFrom(...peerIds);

      const allCommands = [
        peerId1.map((x) => new CreatePeerCommand(x)),
        peerId1.map((x) => new RemovePeerCommand(x)),
        peerId1.map((p) => new JoinTopicCommand(p)),
        peerId1.map((p) => new LeaveTopicCommand(p))
      ];

      await fc.assert(
        fc.asyncProperty(fc.commands(allCommands, { maxCommands: 30 }), async (cmds) => {
          const s: ModelRunSetup<Model, Real> = () => ({
            model: {
              topic: PublicKey.random(),
              peers: new ComplexSet(PublicKey.hash),
              joinedPeers: new ComplexSet(PublicKey.hash)
            },
            real: {
              peers: new ComplexMap(PublicKey.hash)
            }
          });
          await fc.asyncModelRun(s, cmds);
        }),
        {
          examples: [
            [
              [
                new CreatePeerCommand(peerIds[0]),
                new CreatePeerCommand(peerIds[1]),
                new JoinTopicCommand(peerIds[0]),
                new JoinTopicCommand(peerIds[1]),
                new LeaveTopicCommand(peerIds[0]),
                new LeaveTopicCommand(peerIds[1]),
                new RemovePeerCommand(peerIds[0]),
                new RemovePeerCommand(peerIds[1])
              ]
            ],
            [
              [
                new CreatePeerCommand(peerIds[0]),
                new JoinTopicCommand(peerIds[0]),
                new CreatePeerCommand(peerIds[1]),
                new RemovePeerCommand(peerIds[0]),
                new JoinTopicCommand(peerIds[1]),
                new RemovePeerCommand(peerIds[1])
              ]
            ],
            [
              [
                new CreatePeerCommand(peerIds[0]),
                new JoinTopicCommand(peerIds[0]),
                new RemovePeerCommand(peerIds[0]),
                new CreatePeerCommand(peerIds[1]),
                new JoinTopicCommand(peerIds[1]),
                new CreatePeerCommand(peerIds[2]),
                new JoinTopicCommand(peerIds[2])
              ]
            ]
          ]
        }
      );
    })
      .timeout(30_000)
      .retries(10);
  }).timeout(30_000);
});
