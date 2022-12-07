//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { TestBuilder as ConnectionFactory, TestPeer as Connection } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { PresenceExtension } from './presence-extension';
import { PresenceManager } from './presence-manager';
import { TestBuilder } from './testing';

describe('PresenceManager', () => {
  test('Announce', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const connectionFactory = new ConnectionFactory();
    await builder.connectAgents(agent1, agent2, connectionFactory);

    await waitForExpect(() => {
      expect(agent1.presenceManager.getPeerStates().length).toEqual(1);
      expect(agent2.presenceManager.getPeerStates().length).toEqual(1);
      expect(agent1.presenceManager.getPeerStates()[0].peerId).toEqual(agent2.peerId);
      expect(agent2.presenceManager.getPeerStates()[0].peerId).toEqual(agent1.peerId);
    });
  });

  test('Reannounce', async () => {
    afterTest(() => builder.destroy());
    const builder = new TestBuilder();

    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    const connectionFactory = new ConnectionFactory();
    const { peer1: connection12, peer2: connection21 } = await connectionFactory.createPipedPeers({
      peerId1: agent1.peerId,
      peerId2: agent2.peerId
    });
    agent1.addConnection(connection12);

    const received: PeerState[] = [];
    const presenceExtension = new PresenceExtension({
      connections: [agent1.peerId],
      resendAnnounce: 50,
      onAnnounce: async (peerState: PeerState) => {
        expect(peerState.peerId.equals(agent1.peerId)).toBeTruthy();
        if (peerState.connections?.length === 1) {
          expect(peerState.connections[0].equals(agent2.peerId)).toBeTruthy();
        }
        received.push(peerState);
      }
    });
    connection21.teleport?.addExtension('dxos.mesh.teleport.presence', presenceExtension);

    await waitForExpect(() => {
      expect(received.length).toEqual(10);
    });
  });

  test('Gets indirect announces', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    // Initialize 3 peers.
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    const agent3 = builder.createAgent();
    const connectionFactory = new ConnectionFactory();

    // Connect first and second peer.
    await builder.connectAgents(agent1, agent2, connectionFactory);

    // Connect second and third peer.
    await builder.connectAgents(agent2, agent3, connectionFactory);

    // Check if first and third peers "see" each other.
    await waitForExpect(() => {
      expect(
        agent1.presenceManager.getPeerStatesOnline().some((state) => state.peerId.equals(agent3.peerId))
      ).toBeTruthy();
      expect(
        agent3.presenceManager.getPeerStatesOnline().some((state) => state.peerId.equals(agent1.peerId))
      ).toBeTruthy();
    }, 500);
  });

  test('One connection drops after some time', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    // Initialize 3 peers.
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    const agent3 = builder.createAgent();
    const connectionFactory = new ConnectionFactory();

    // Connect first and second peer.
    await builder.connectAgents(agent1, agent2, connectionFactory);

    // Connect second and third peer.
    await builder.connectAgents(agent2, agent3, connectionFactory);

    // Check if first and third peers "see" each other.
    await waitForExpect(() => {
      expect(
        agent1.presenceManager.getPeerStatesOnline().some((state) => state.peerId.equals(agent3.peerId))
      ).toBeTruthy();
      expect(
        agent3.presenceManager.getPeerStatesOnline().some((state) => state.peerId.equals(agent1.peerId))
      ).toBeTruthy();
    }, 500);

    // Third peer got disconnected.
    await agent3.destroy();

    // Check if third peer is offline for first and second peer.
    await waitForExpect(() => {
      expect(
        agent1.presenceManager.getPeerStatesOnline().every((state) => !state.peerId.equals(agent3.peerId))
      ).toBeTruthy();
      expect(
        agent2.presenceManager.getPeerStatesOnline().every((state) => !state.peerId.equals(agent3.peerId))
      ).toBeTruthy();
    }, 500);
  });

  test('cycle', async () => {
    // first peer  <->  second peer  <->  third  peer  <-> first peer
    const builder = new TestBuilder();
    const peerId = PublicKey.random();

    const presenceManager1 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 1000 });
    presenceManager1.createExtension({ teleport: agent1.teleport! });

    const presenceManager2 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 1000 });
    presenceManager2.createExtension({ teleport: agent2.teleport! });

    await agent1.teleport?.close();

    await waitForExpect(() => {
      expect(presenceManager1.getPeerStates().length).toEqual(0);
      expect(presenceManager2.getPeerStates().length).toEqual(0);
    });
  });
});
