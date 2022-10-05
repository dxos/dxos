//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import * as fc from 'fast-check';
import { ModelRunSetup } from 'fast-check';
import waitForExpect from 'wait-for-expect';

import { Event, latch, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import { MemorySignalManagerContext, MemorySignalManager, WebsocketSignalManager } from '@dxos/messaging';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { afterTest } from '@dxos/testutils';
import { range, ComplexMap, ComplexSet } from '@dxos/util';

import { NetworkManager } from './network-manager';
import { createProtocolFactory } from './protocol-factory';
import { TestProtocolPlugin, testProtocolProvider } from './testing/test-protocol';
import { FullyConnectedTopology, StarTopology, Topology } from './topology';

const signalContext = new MemorySignalManagerContext();

interface CreatePeerOptions {
  topic: PublicKey
  peerId: PublicKey
  topology?: Topology
  signalHosts?: string[]
  ice?: any
}

const createPeer = async ({
  topic,
  peerId,
  topology = new FullyConnectedTopology(),
  signalHosts,
  ice
}: CreatePeerOptions) => {
  const signalManager = signalHosts ? new WebsocketSignalManager(signalHosts!) : new MemorySignalManager(signalContext);
  await signalManager.subscribeMessages(peerId);
  const networkManager = new NetworkManager({ signalManager, ice });
  afterTest(() => networkManager.destroy());

  const plugin = new TestProtocolPlugin(peerId.asBuffer());
  const protocolProvider = testProtocolProvider(topic.asBuffer(), peerId.asBuffer(), plugin);
  await networkManager.joinProtocolSwarm({ topic, peerId, protocol: protocolProvider, topology });

  return {
    networkManager,
    plugin
  };
};

const sharedTests = ({ inMemory, signalUrl }: { inMemory: boolean, signalUrl?: string }) => {
  it('two peers connect to each other', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const { plugin: plugin1, networkManager: nm1 } =
      await createPeer({ topic, peerId: peer1Id, signalHosts: !inMemory ? [signalUrl!] : undefined });
    const { plugin: plugin2, networkManager: nm2 } =
      await createPeer({ topic, peerId: peer2Id, signalHosts: !inMemory ? [signalUrl!] : undefined });

    const received: any[] = [];
    const mockReceive = (p: Protocol, s: string) => {
      received.push(p, s);
      return undefined;
    };
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async () => {
      await plugin2.send(peer1Id.asBuffer(), 'Foo');
    });
    await waitForExpect(() => {
      expect(received.length).toBe(2);
      expect(received[0]).toBeInstanceOf(Protocol);
      expect(received[1]).toBe('Foo');
    });
    await nm1.destroy();
    await nm2.destroy();
  }).timeout(10_000).retries(10);

  it('join and leave swarm', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const { networkManager: networkManager1, plugin: plugin1 } =
      await createPeer({ topic, peerId: peer1Id, signalHosts: !inMemory ? [signalUrl!] : undefined });
    const { networkManager: networkManager2, plugin: plugin2 } =
      await createPeer({ topic, peerId: peer2Id, signalHosts: !inMemory ? [signalUrl!] : undefined });

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
  }).timeout(10_000).retries(10);

  it('join and leave swarm and reconnect', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const { networkManager: networkManager1, plugin: plugin1 } =
      await createPeer({ topic, peerId: peer1Id, signalHosts: !inMemory ? [signalUrl!] : undefined });
    const { networkManager: networkManager2, plugin: plugin2 } =
      await createPeer({ topic, peerId: peer2Id, signalHosts: !inMemory ? [signalUrl!] : undefined });

    await Promise.all([
      Event.wrap(plugin1, 'connect').waitForCount(1),
      Event.wrap(plugin2, 'connect').waitForCount(1)
    ]);

    log('Connected');

    const disconnectPromises = Promise.all([
      Event.wrap(plugin1, 'disconnect').waitForCount(1),
      Event.wrap(plugin2, 'disconnect').waitForCount(1)
    ]);

    const connectPromises = Promise.all([
      Event.wrap(plugin1, 'connect').waitForCount(1),
      Event.wrap(plugin2, 'connect').waitForCount(1)
    ]);

    log('Disconnecting peer2');
    await networkManager2.leaveProtocolSwarm(topic);

    log('Reconnecting peer2');
    const newPeer2Id = PublicKey.random();
    await networkManager2.joinProtocolSwarm({
      topic,
      peerId: newPeer2Id,
      protocol: testProtocolProvider(topic.asBuffer(), peer2Id.asBuffer(), plugin2),
      topology: new FullyConnectedTopology()
    });

    await disconnectPromises;

    await connectPromises;

    await networkManager1.destroy();
    log('Peer1 destroyed');
    await networkManager2.destroy();
    log('Peer2 destroyed');
  }).timeout(10_000).retries(10);

  it('join 2 swarms', async () => {
    const peerId = PublicKey.random();
    const plugin1 = new TestProtocolPlugin(peerId.asBuffer());
    const plugin2 = new TestProtocolPlugin(peerId.asBuffer());

    const signalManager = inMemory ? new MemorySignalManager(signalContext) : new WebsocketSignalManager([signalUrl!]);
    const networkManager = new NetworkManager({ signalManager });
    afterTest(() => networkManager.destroy());

    // Joining first swarm.
    {
      const topic = PublicKey.random();
      const protocolProvider = testProtocolProvider(topic.asBuffer(), peerId.asBuffer(), plugin1);
      await networkManager.joinProtocolSwarm({ topic, peerId, protocol: protocolProvider, topology: new FullyConnectedTopology() });
      // Creating and joining second peer.
      await createPeer({ topic, peerId: PublicKey.random(), signalHosts: !inMemory ? [signalUrl!] : undefined });
    }

    // Joining second swarm with same peerId.
    {
      const topic = PublicKey.random();
      const protocolProvider = testProtocolProvider(topic.asBuffer(), peerId.asBuffer(), plugin2);
      await networkManager.joinProtocolSwarm({ topic, peerId, protocol: protocolProvider, topology: new FullyConnectedTopology() });
      // Creating and joining second peer.
      await createPeer({ topic, peerId: PublicKey.random(), signalHosts: !inMemory ? [signalUrl!] : undefined });
    }

    await Promise.all([
      Event.wrap(plugin1, 'connect').waitForCount(1),
      Event.wrap(plugin2, 'connect').waitForCount(1)
    ]);
  });
};

// eslint-disable-next-line jest/no-export
export const webRTCTests = ({ signalUrl }: { signalUrl?: string } = {}) => {
  let topic: PublicKey;
  let peer1Id: PublicKey;
  let peer2Id: PublicKey;

  beforeEach(() => {
    topic = PublicKey.random();
    peer1Id = PublicKey.random();
    peer2Id = PublicKey.random();
  });

  sharedTests({ inMemory: false, signalUrl });

  it.skip('two peers with different signal & turn servers', async () => {
    const { networkManager: networkManager1, plugin: plugin1 } = await createPeer({
      topic,
      peerId: peer1Id,
      signalHosts: ['wss://apollo3.kube.moon.dxos.network/dxos/signal'],
      ice: [{ urls: 'turn:apollo3.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }]
    });
    await sleep(3000);
    const { networkManager: networkManager2, plugin: plugin2 } = await createPeer({
      topic,
      peerId:
        peer2Id,
      signalHosts: ['wss://apollo2.kube.moon.dxos.network/dxos/signal'],
      ice: [{ urls: 'turn:apollo2.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }]
    });

    const received: any[] = [];
    const mockReceive = (p: Protocol, s: string) => {
      received.push(p, s);
      return undefined;
    };
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async () => {
      await plugin2.send(peer1Id.asBuffer(), 'Foo');
    });

    await waitForExpect(() => {
      expect(received.length).toBe(2);
      expect(received[0]).toBeInstanceOf(Protocol);
      expect(received[1]).toBe('Foo');
    });

    await networkManager1.destroy();
    await networkManager2.destroy();
  }).timeout(10_000).retries(10);

  describe('StarTopology', () => {
    it('two peers connect to each other', async () => {
      const { plugin: plugin1 } = await createPeer({ topic, peerId: peer1Id, topology: new StarTopology(peer1Id) });
      const { plugin: plugin2 } = await createPeer({ topic, peerId: peer2Id, topology: new StarTopology(peer1Id) });

      const received: any[] = [];
      const mockReceive = (p: Protocol, s: string) => {
        received.push(p, s);
        return undefined;
      };
      plugin1.on('receive', mockReceive);

      plugin2.on('connect', async () => {
        await plugin2.send(peer1Id.asBuffer(), 'Foo');
      });

      await waitForExpect(() => {
        expect(received.length).toBe(2);
        expect(received[0]).toBeInstanceOf(Protocol);
        expect(received[1]).toBe('Foo');
      });
    }).timeout(10_000).retries(10);
  });
};

// eslint-disable-next-line jest/no-export
export function inMemoryTests () {
  sharedTests({ inMemory: true });

  it('two swarms at the same time', async () => {
    const topicA = PublicKey.random();
    const topicB = PublicKey.random();
    const peerA1Id = PublicKey.random();
    const peerA2Id = PublicKey.random();
    const peerB1Id = PublicKey.random();
    const peerB2Id = PublicKey.random();

    const { plugin: pluginA1 } = await createPeer({ topic: topicA, peerId: peerA1Id });
    const { plugin: pluginA2 } = await createPeer({ topic: topicA, peerId: peerA2Id });
    const { plugin: pluginB1 } = await createPeer({ topic: topicB, peerId: peerB1Id });
    const { plugin: pluginB2 } = await createPeer({ topic: topicB, peerId: peerB2Id });

    const receivedA: any[] = [];
    const mockReceiveA = (p: Protocol, s: string) => {
      receivedA.push(p, s);
      return undefined;
    };
    pluginA1.on('receive', mockReceiveA);
    const receivedB: any[] = [];
    const mockReceiveB = (p: Protocol, s: string) => {
      receivedB.push(p, s);
      return undefined;
    };
    pluginB1.on('receive', mockReceiveB);

    pluginA2.on('connect', async () => {
      await pluginA2.send(peerA1Id.asBuffer(), 'Foo A');
    });
    pluginB2.on('connect', async () => {
      await pluginB2.send(peerB1Id.asBuffer(), 'Foo B');
    });

    await waitForExpect(() => {
      expect(receivedA.length).toBe(2);
      expect(receivedA[0]).toBeInstanceOf(Protocol);
      expect(receivedA[1]).toBe('Foo A');
      expect(receivedB.length).toBe(2);
      expect(receivedB[0]).toBeInstanceOf(Protocol);
      expect(receivedB[1]).toBe('Foo B');
    });
  });

  it('large amount of peers and connections', async () => {
    const numTopics = 5;
    const peersPerTopic = 5;

    await Promise.all(range(numTopics).map(async () => {
      const topic = PublicKey.random();

      await Promise.all(range(peersPerTopic).map(async (_, index) => {
        const peerId = PublicKey.random();
        const { plugin } = await createPeer({ topic, peerId });

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

        await done;
      }));
    }));
  });

  it('property-based it', async () => {
    interface Model {
      topic: PublicKey
      peers: ComplexSet<PublicKey>
      joinedPeers: ComplexSet<PublicKey>
    }

    // TODO(burdon): Name?
    interface Real {
      peers: ComplexMap<PublicKey, {
        networkManager: NetworkManager
        presence?: PresencePlugin
      }>
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
              if (!actuallyConnectedPeers.some(x => PublicKey.equals(expectedJoinedPeer, x))) {
                throw new Error(`Expected ${expectedJoinedPeer} to be in the list of joined peers of peer ${peer.presence.peerId.toString('hex')}, actually connected peers: ${actuallyConnectedPeers.map(key => key.toString('hex'))}`);
              }
            }
          }
        }
      }, 5_000);

      real.peers.forEach(peer => peer.networkManager.topics.forEach(topic => {
        peer.networkManager.getSwarm(topic)!.errors.assertNoUnhandledErrors();
      }));
    };

    class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
      constructor (readonly peerId: PublicKey) { }

      check = (model: Model) => !model.peers.has(this.peerId);

      async run (model: Model, real: Real) {
        model.peers.add(this.peerId);

        const networkManager = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
        afterTest(() => networkManager.destroy());

        real.peers.set(this.peerId, {
          networkManager
        });

        await assertState(model, real);
      }

      toString = () => `CreatePeer(${this.peerId})`;
    }

    class RemovePeerCommand implements fc.AsyncCommand<Model, Real> {
      constructor (readonly peerId: PublicKey) { }

      check = (model: Model) => model.peers.has(this.peerId);

      async run (model: Model, real: Real) {
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
      constructor (readonly peerId: PublicKey) { }

      check = (model: Model) => model.peers.has(this.peerId) && !model.joinedPeers.has(this.peerId);

      async run (model: Model, real: Real) {
        model.joinedPeers.add(this.peerId);

        const peer = real.peers.get(this.peerId)!;

        const presence = new PresencePlugin(this.peerId.asBuffer());
        afterTest(() => presence.stop());
        const protocol = createProtocolFactory(model.topic, this.peerId, [presence]);

        await peer.networkManager.joinProtocolSwarm({
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
      constructor (readonly peerId: PublicKey) { }

      check = (model: Model) => model.peers.has(this.peerId) && model.joinedPeers.has(this.peerId);

      async run (model: Model, real: Real) {
        model.joinedPeers.delete(this.peerId);

        const peer = real.peers.get(this.peerId)!;

        await peer.networkManager.leaveProtocolSwarm(model.topic);
        peer.presence = undefined;

        await assertState(model, real);
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
            peers: new ComplexSet(key => key.toHex()),
            joinedPeers: new ComplexSet(key => key.toHex())
          },
          real: {
            peers: new ComplexMap(key => key.toHex())
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
  }).timeout(30_000).retries(10);
}
