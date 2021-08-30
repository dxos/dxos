//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { expect, mockFn } from 'earljs';
import * as fc from 'fast-check';
import { ModelRunSetup } from 'fast-check';
import { it as test } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited, Event, latch, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { createTestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';
import { range, randomInt, ComplexMap, ComplexSet } from '@dxos/util';

import { NetworkManager } from './network-manager';
import { createProtocolFactory } from './protocol-factory';
import { TestProtocolPlugin, testProtocolProvider } from './testing/test-protocol';
import { FullyConnectedTopology, StarTopology, Topology } from './topology';

const log = debug('dxos:network-manager:test');

interface CreatePeerOptions {
  topic: PublicKey
  peerId: PublicKey
  inMemory?: boolean
  topology?: Topology
  signal?: string[]
  ice?: any
}

const signalApiPort = randomInt(10000, 50000);
const signalApiUrl = 'http://0.0.0.0:' + signalApiPort;

const createPeer = async ({
  topic,
  peerId,
  inMemory,
  topology = new FullyConnectedTopology(),
  signal = !inMemory ? [signalApiUrl] : undefined,
  ice
}: CreatePeerOptions) => {
  const networkManager = new NetworkManager({ signal, ice });

  const plugin = new TestProtocolPlugin(peerId.asBuffer());
  const protocolProvider = testProtocolProvider(topic.asBuffer(), peerId.asBuffer(), plugin);
  networkManager.joinProtocolSwarm({ topic, peerId, protocol: protocolProvider, topology });

  return {
    networkManager,
    plugin
  };
};

describe('Network manager', () => {
  function sharedTests (inMemory: boolean) {
    test('two peers connect to each other', async () => {
      const topic = PublicKey.random();
      const peer1Id = PublicKey.random();
      const peer2Id = PublicKey.random();

      const { plugin: plugin1, networkManager: nm1 } = await createPeer({ topic, peerId: peer1Id, inMemory });
      const { plugin: plugin2, networkManager: nm2 } = await createPeer({ topic, peerId: peer2Id, inMemory });

      const mockReceive = mockFn<[Protocol, string]>().returns(undefined);
      plugin1.on('receive', mockReceive);

      plugin2.on('connect', async () => {
        plugin2.send(peer1Id.asBuffer(), 'Foo');
      });

      await waitForExpect(() => {
        expect(plugin1.initCalled).toEqual(true);
        expect(plugin2.initCalled).toEqual(true);
        expect(mockReceive).toHaveBeenCalledWith([expect.a(Protocol), 'Foo']);
      });

      await nm1.destroy();
      await nm2.destroy();
    }).timeout(10_000);

    test('join and leave swarm', async () => {
      const topic = PublicKey.random();
      const peer1Id = PublicKey.random();
      const peer2Id = PublicKey.random();

      const { networkManager: networkManager1, plugin: plugin1 } = await createPeer({ topic, peerId: peer1Id, inMemory });
      const { networkManager: networkManager2, plugin: plugin2 } = await createPeer({ topic, peerId: peer2Id, inMemory });

      await Promise.all([
        Event.wrap(plugin1, 'connect').waitForCount(1),
        Event.wrap(plugin2, 'connect').waitForCount(1)
      ]);

      log('Connected');

      const promise1 = Event.wrap(plugin1, 'disconnect').waitForCount(1);
      const promise2 = Event.wrap(plugin2, 'disconnect').waitForCount(1);

      await networkManager1.leaveProtocolSwarm(topic);

      await promise1;

      log('Peer1 disconnected');

      await promise2;

      log('Peer2 disconnected');

      await networkManager1.destroy();
      log('Peer1 destroyed');
      await networkManager2.destroy();
      log('Peer2 destroyed');
    }).timeout(10_000);
  }

  describe('WebRTC transport', () => {
    let topic: PublicKey;
    let peer1Id: PublicKey;
    let peer2Id: PublicKey;
    let broker: Awaited<ReturnType<typeof createTestBroker>>;

    before(async function () {
      broker = await createTestBroker(signalApiPort);
    });

    after(async function () {
      await broker?.stop();
    });

    beforeEach(() => {
      topic = PublicKey.random();
      peer1Id = PublicKey.random();
      peer2Id = PublicKey.random();
    });

    sharedTests(false);

    it.skip('two peers with different signal & turn servers', async () => {
      const { networkManager: networkManager1, plugin: plugin1 } = await createPeer({ topic, peerId: peer1Id, signal: ['wss://apollo3.kube.moon.dxos.network/dxos/signal'], ice: [{ urls: 'turn:apollo3.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }] });
      await sleep(3000);
      const { networkManager: networkManager2, plugin: plugin2 } = await createPeer({ topic, peerId: peer2Id, signal: ['wss://apollo2.kube.moon.dxos.network/dxos/signal'], ice: [{ urls: 'turn:apollo2.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }] });

      const mockReceive = mockFn<[Protocol, string]>().returns(undefined);
      plugin1.on('receive', mockReceive);

      plugin2.on('connect', async () => {
        plugin2.send(peer1Id.asBuffer(), 'Foo');
      });

      await waitForExpect(() => {
        expect(mockReceive).toHaveBeenCalledWith([expect.a(Protocol), 'Foo']);
      });

      await networkManager1.destroy();
      await networkManager2.destroy();
    }).timeout(10_000);

    describe('StarTopology', () => {
      test('two peers connect to each other', async () => {
        const { plugin: plugin1 } = await createPeer({ topic, peerId: peer1Id, topology: new StarTopology(peer1Id) });
        const { plugin: plugin2 } = await createPeer({ topic, peerId: peer2Id, topology: new StarTopology(peer1Id) });

        const mockReceive = mockFn<[Protocol, string]>().returns(undefined);
        plugin1.on('receive', mockReceive);

        plugin2.on('connect', async () => {
          plugin2.send(peer1Id.asBuffer(), 'Foo');
        });

        await waitForExpect(() => {
          expect(mockReceive).toHaveBeenCalledWith([expect.a(Protocol), 'Foo']);
        });
      }).timeout(10_000);
    });
  }).timeout(10_000);

  describe('In-memory transport', () => {
    sharedTests(true);

    test('two swarms at the same time', async () => {
      const topicA = PublicKey.random();
      const topicB = PublicKey.random();
      const peerA1Id = PublicKey.random();
      const peerA2Id = PublicKey.random();
      const peerB1Id = PublicKey.random();
      const peerB2Id = PublicKey.random();

      const { plugin: pluginA1 } = await createPeer({ topic: topicA, peerId: peerA1Id, inMemory: true });
      const { plugin: pluginA2 } = await createPeer({ topic: topicA, peerId: peerA2Id, inMemory: true });
      const { plugin: pluginB1 } = await createPeer({ topic: topicB, peerId: peerB1Id, inMemory: true });
      const { plugin: pluginB2 } = await createPeer({ topic: topicB, peerId: peerB2Id, inMemory: true });

      const mockReceiveA = mockFn<[Protocol, string]>().returns(undefined);
      pluginA1.on('receive', mockReceiveA);
      const mockReceiveB = mockFn<[Protocol, string]>().returns(undefined);
      pluginB1.on('receive', mockReceiveB);

      pluginA2.on('connect', async () => {
        pluginA2.send(peerA1Id.asBuffer(), 'Foo A');
      });
      pluginB2.on('connect', async () => {
        pluginB2.send(peerB1Id.asBuffer(), 'Foo B');
      });

      await waitForExpect(() => {
        expect(mockReceiveA).toHaveBeenCalledWith([expect.a(Protocol), 'Foo A']);
        expect(mockReceiveB).toHaveBeenCalledWith([expect.a(Protocol), 'Foo B']);
      });
    });

    test('large amount of peers and connections', async () => {
      const numTopics = 5;
      const peersPerTopic = 5;

      await Promise.all(range(numTopics).map(async () => {
        const topic = PublicKey.random();

        await Promise.all(range(peersPerTopic).map(async (_, index) => {
          const peerId = PublicKey.random();
          const { plugin } = await createPeer({ topic, peerId, inMemory: true });

          const [done, pongReceived] = latch(peersPerTopic - 1);

          plugin.on('connect', async (protocol: Protocol) => {
            const { peerId } = protocol.getSession() ?? {};
            const remoteId = PublicKey.from(peerId);

            plugin.send(remoteId.asBuffer(), 'ping');
          });

          plugin.on('receive', (protocol: Protocol, data: any) => {
            const { peerId } = protocol.getSession() ?? {};
            const remoteId = PublicKey.from(peerId);

            if (data === 'ping') {
              plugin.send(remoteId.asBuffer(), 'pong');
            } else if (data === 'pong') {
              pongReceived();
            } else {
              throw new Error(`Invalid message: ${data}`);
            }
          });

          await done;
        }));
      }));
    });

    test('property-based test', async () => {
      interface Model {
        topic: PublicKey
        peers: ComplexSet<PublicKey>
        joinedPeers: ComplexSet<PublicKey>
      }
      interface Real {
        peers: ComplexMap<PublicKey, {
          networkManager: NetworkManager
          presence?: PresencePlugin
        }>
      }

      async function assertState (m: Model, r: Real) {
        await waitForExpect(() => {
          for (const peer of r.peers.values()) {
            if (peer.presence) {
              for (const expectedJoinedPeer of m.joinedPeers) {
                if (expectedJoinedPeer.equals(peer.presence.peerId)) {
                  continue;
                }

                const actuallyConnectedPeers = peer.presence!.peers;
                expect(
                  actuallyConnectedPeers.some(x => PublicKey.equals(expectedJoinedPeer, x)),
                  {
                    extraMessage: `Expected ${expectedJoinedPeer} to be in the list of joined peers of peer ${peer.presence.peerId.toString('hex')}, actually connected peers: ${actuallyConnectedPeers.map(x => x.toString('hex'))}`
                  }
                ).toEqual(true);
              }
            }
          }
        }, 5_000);

        r.peers.forEach(peer => peer.networkManager.topics.forEach(topic => {
          peer.networkManager.getSwarm(topic)!.errors.assertNoUnhandledErrors();
        }));
      }

      class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
        constructor (readonly peerId: PublicKey) {}

        check = (m: Model) => !m.peers.has(this.peerId);

        async run (m: Model, r: Real) {
          m.peers.add(this.peerId);

          const networkManager = new NetworkManager();
          afterTest(() => networkManager.destroy());

          r.peers.set(this.peerId, {
            networkManager
          });

          await assertState(m, r);
        }

        toString = () => `CreatePeer(${this.peerId})`;
      }

      class RemovePeerCommand implements fc.AsyncCommand<Model, Real> {
        constructor (readonly peerId: PublicKey) {}

        check = (m: Model) => m.peers.has(this.peerId);

        async run (m: Model, r: Real) {
          m.peers.delete(this.peerId);
          m.joinedPeers.delete(this.peerId);

          const peer = r.peers.get(this.peerId);
          await peer!.networkManager.destroy();
          r.peers.delete(this.peerId);

          await assertState(m, r);
        }

        toString = () => `RemovePeer(${this.peerId})`;
      }

      class JoinTopicCommand implements fc.AsyncCommand<Model, Real> {
        constructor (readonly peerId: PublicKey) {}

        check = (m: Model) =>
          m.peers.has(this.peerId) &&
          !m.joinedPeers.has(this.peerId);

        async run (m: Model, r: Real) {
          m.joinedPeers.add(this.peerId);

          const peer = r.peers.get(this.peerId)!;

          const presence = new PresencePlugin(this.peerId.asBuffer());
          const protocol = createProtocolFactory(m.topic, this.peerId, [presence]);

          peer.networkManager.joinProtocolSwarm({
            peerId: this.peerId, // TODO(burdon): this?
            topic: m.topic,
            protocol,
            topology: new FullyConnectedTopology(),
            presence
          });

          peer.presence = presence;

          await assertState(m, r);
        }

        toString = () => `JoinTopic(peerId=${this.peerId})`;
      }

      class LeaveTopicCommand implements fc.AsyncCommand<Model, Real> {
        constructor (readonly peerId: PublicKey) {}

        check = (m: Model) =>
          m.peers.has(this.peerId) &&
          m.joinedPeers.has(this.peerId);

        async run (m: Model, r: Real) {
          m.joinedPeers.delete(this.peerId);

          const peer = r.peers.get(this.peerId)!;

          peer.networkManager.leaveProtocolSwarm(m.topic);
          peer.presence = undefined;

          await assertState(m, r);
        }

        toString = () => `LeaveTopic(peerId=${this.peerId})`;
      }

      const peerIds = range(10).map(() => PublicKey.random());

      const aPeerId = fc.constantFrom(...peerIds);

      const allCommands = [
        aPeerId.map(x => new CreatePeerCommand(x)),
        aPeerId.map(x => new RemovePeerCommand(x)),
        aPeerId.map(p => new JoinTopicCommand(p)),
        aPeerId.map(p => new LeaveTopicCommand(p))
      ];

      await fc.assert(
        fc.asyncProperty(fc.commands(allCommands, { maxCommands: 30 }), async cmds => {
          const s: ModelRunSetup<Model, Real> = () => ({
            model: {
              topic: PublicKey.random(),
              peers: new ComplexSet(x => x.toHex()),
              joinedPeers: new ComplexSet(x => x.toHex())
            },
            real: {
              peers: new ComplexMap(x => x.toHex())
            }

          });
          await fc.asyncModelRun(s, cmds);
        }),
        {
          examples: [
            [[
              new CreatePeerCommand(peerIds[0]),
              new CreatePeerCommand(peerIds[1]),
              new JoinTopicCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[1]),
              new LeaveTopicCommand(peerIds[0]),
              new LeaveTopicCommand(peerIds[1]),
              new RemovePeerCommand(peerIds[0]),
              new RemovePeerCommand(peerIds[1])
            ]],
            [[
              new CreatePeerCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[0]),
              new CreatePeerCommand(peerIds[1]),
              new RemovePeerCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[1]),
              new RemovePeerCommand(peerIds[1])
            ]],
            [[
              new CreatePeerCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[0]),
              new RemovePeerCommand(peerIds[0]),
              new CreatePeerCommand(peerIds[1]),
              new JoinTopicCommand(peerIds[1]),
              new CreatePeerCommand(peerIds[2]),
              new JoinTopicCommand(peerIds[2])
            ]]
          ]
        }
      );
    }).timeout(30_000);
  });
});
