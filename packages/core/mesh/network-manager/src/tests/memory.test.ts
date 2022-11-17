//
// Copyright 2021 DXOS.org
//

import * as fc from 'fast-check';
import { ModelRunSetup } from 'fast-check';
import waitForExpect from 'wait-for-expect';

import { latch } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { afterTest } from '@dxos/testutils';
import { range, ComplexMap, ComplexSet } from '@dxos/util';

import { NetworkManager } from '../network-manager';
import { createProtocolFactory } from '../protocol-factory';
import { createPeer, TestBuilder } from '../testing';
import { FullyConnectedTopology } from '../topology';
import { MemoryTransportFactory } from '../transport';
import { testSuite } from './test-suite';

describe('memory transport', function () {
  const testBuilder = new TestBuilder();

  testSuite({
    testBuilder,
    getTransportFactory: async () => MemoryTransportFactory
  });

  // TODO(burdon): Move to test suite?
  it.skip('many peers and connections', async function () {
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

  // TODO(burdon): Move to test suite (or multiple).
  // TODO(dmaretskyi): Run this with actual webrtc and signal servers.
  // This test performs random actions in the real system and compares it's state with a simplified model.
  it('property-based tests', async function () {
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
      peers: ComplexMap<PublicKey, { networkManager: NetworkManager; presence?: PresencePlugin }>;
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
              if (!actuallyConnectedPeers.some((peer) => PublicKey.equals(expectedJoinedPeer, peer))) {
                // TODO(burdon): More concise error.
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

    class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
      constructor(readonly peerId: PublicKey) {}

      check = (model: Model) => !model.peers.has(this.peerId);
      async run(model: Model, real: Real) {
        // TODO(burdon): ???
        throw new Error('Not implemented.');
        // model.peers.add(this.peerId);
        // const networkManager = testBuilder.createNetworkManager();
        // afterTest(() => networkManager.close());
        //
        // real.peers.set(this.peerId, {
        //   networkManager
        // });
        //
        // await assertState(model, real);
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
        await peer!.networkManager.close();
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

        await peer.networkManager.joinSwarm({
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
        await peer.networkManager.leaveSwarm(model.topic);
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
  });
});
