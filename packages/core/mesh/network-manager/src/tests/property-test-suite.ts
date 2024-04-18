//
// Copyright 2021 DXOS.org
//

import * as fc from 'fast-check';
import { type ModelRunSetup } from 'fast-check';
import waitForExpect from 'wait-for-expect';

import { todo } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { test } from 'vitest'
import { ComplexMap, ComplexSet, range } from '@dxos/util';

import { type NetworkManager } from '../network-manager';
import { FullyConnectedTopology } from '../topology';

/**
 * Performs random actions in the real system and compares its state with a simplified model.
 */
// TODO(dmaretskyi): Run this with actual webrtc and signal servers.
export const propertyTestSuite = () => {
  test.skip('property-based tests', async function () {
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
      peers: ComplexMap<PublicKey, { networkManager: NetworkManager; presence?: any }>;
    }

    const assertState = async (model: Model, real: Real) => {
      await waitForExpect(() => {
        for (const peer of real.peers.values()) {
          if (peer.presence) {
            for (const expectedPeerId of model.joinedPeers) {
              if (expectedPeerId.equals(peer.presence.peerId)) {
                continue;
              }

              const actuallyConnectedPeers = peer.presence!.peers;
              if (!actuallyConnectedPeers.some((peer: any) => PublicKey.equals(expectedPeerId, peer))) {
                // TODO(burdon): More concise error.
                const context = {
                  peerId: peer.presence.peerId,
                  expectedPeerId: expectedPeerId.truncate(),
                  connectedPeerIds: actuallyConnectedPeers.map((key: any) => key.toString('hex')),
                };

                throw new Error(`Expected peer to be in the list of joined peers: ${context}`);
              }
            }
          }
        }
      }, 5_000);

      real.peers.forEach((peer) =>
        peer.networkManager.topics.forEach((topic) => {
          peer.networkManager.getSwarm(topic)!.errors.assertNoUnhandledErrors();
        }),
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

        // real.peers.set(this.peerId, {
        //   networkManager
        // });

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

        // const presence = new PresencePlugin(this.peerId.asBuffer());
        // afterTest(() => presence.stop());
        // const protocol = createProtocolFactory(model.topic, this.peerId, [presence]);

        await peer.networkManager.joinSwarm({
          peerId: this.peerId, // TODO(burdon): `this`?
          topic: model.topic,
          protocolProvider: todo(),
          topology: new FullyConnectedTopology(),
          // presence
        });

        // peer.presence = presence;

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
      peerId1.map((p) => new LeaveTopicCommand(p)),
    ];

    await fc.assert(
      fc.asyncProperty(fc.commands(allCommands, { maxCommands: 30 }), async (cmds) => {
        const setup: ModelRunSetup<Model, Real> = () => ({
          model: {
            topic: PublicKey.random(),
            peers: new ComplexSet(PublicKey.hash),
            joinedPeers: new ComplexSet(PublicKey.hash),
          },
          real: {
            peers: new ComplexMap(PublicKey.hash),
          },
        });

        await fc.asyncModelRun(setup, cmds);
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
              new RemovePeerCommand(peerIds[1]),
            ],
          ],
          [
            [
              new CreatePeerCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[0]),
              new CreatePeerCommand(peerIds[1]),
              new RemovePeerCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[1]),
              new RemovePeerCommand(peerIds[1]),
            ],
          ],
          [
            [
              new CreatePeerCommand(peerIds[0]),
              new JoinTopicCommand(peerIds[0]),
              new RemovePeerCommand(peerIds[0]),
              new CreatePeerCommand(peerIds[1]),
              new JoinTopicCommand(peerIds[1]),
              new CreatePeerCommand(peerIds[2]),
              new JoinTopicCommand(peerIds[2]),
            ],
          ],
        ],
      },
    );
  });
};
