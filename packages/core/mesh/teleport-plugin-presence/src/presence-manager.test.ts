//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { TestBuilder as ConnectionFactory, TestPeer as Connection } from '@dxos/teleport/testing';
import { describe, test } from '@dxos/test';

import { PresenceExtension } from './presence-extension';
import { PresenceManager } from './presence-manager';
import { TestBuilder } from './testing';

describe('PresenceManager', () => {
  test.only('Announce', async () => {
    const builder = new TestBuilder();
    const connectionFactory = new ConnectionFactory();

    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    await builder.connectAgents({ agent1, agent2, connectionFactory });

    await waitForExpect(() => {
      expect(agent1.presenceManager.getPeerStates().length).toEqual(1);
      expect(agent2.presenceManager.getPeerStates().length).toEqual(1);
      expect(agent1.presenceManager.getPeerStates()[0].peerId).toEqual(agent2.peerId);
      expect(agent2.presenceManager.getPeerStates()[0].peerId).toEqual(agent1.peerId);
    });
  });

  test.only('Reannounce', async () => {
    const builder = new TestBuilder();
    const connectionFactory = new ConnectionFactory();

    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { peer1: connection12, peer2: connection21 } = await connectionFactory.createPipedPeers();
    agent1.addConnection(connection12);

    const received: PeerState[] = [];
    const presenceExtension = new PresenceExtension({
      connections: [agent1.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState: PeerState) => {
        console.log('onAnnounce', peerState);
        expect(peerState.peerId.equals(agent1.peerId)).toBeTruthy();
        expect(peerState.connections![0].equals(agent2.peerId)).toBeTruthy();
        received.push(peerState);
      }
    });
    connection21.teleport?.addExtension('dxos.mesh.teleport.presence', presenceExtension);

    await waitForExpect(() => {
      expect(received.length).toEqual(10);
    });
  });

  test('Gets indirect announces', async () => {
    // first peer        |  second peer       |  third  peer
    // presenceManager1  |  presenceManager2  |  presenceManager3
    // agent1            |  agent2, agent3    |  agent4

    const builder = new TestBuilder();
    const peerId = PublicKey.random();

    // Initialize 3 peers.
    const presenceManager1 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 200 });
    const presenceManager2 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 200 });
    const presenceManager3 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 200 });

    // Connect first and second peer.
    const { agent1, agent2 } = await builder.createPipedAgents({ peerId2: peerId });
    presenceManager1.createExtension({ teleport: agent1.teleport! });
    presenceManager2.createExtension({ teleport: agent2.teleport! });

    // Connect second and third peer.
    const { agent1: agent3, agent2: agent4 } = await builder.createPipedAgents({ peerId1: peerId });
    presenceManager2.createExtension({ teleport: agent3.teleport! });
    presenceManager3.createExtension({ teleport: agent4.teleport! });

    // Check if first and third peers "see" each other.
    await waitForExpect(() => {
      expect(presenceManager1.getPeerStatesOnline().some((state) => state.peerId.equals(agent4.peerId))).toBeTruthy();
      expect(presenceManager3.getPeerStatesOnline().some((state) => state.peerId.equals(agent1.peerId))).toBeTruthy();
    }, 500);
  });

  test('One connection drops after some time', async () => {
    // first peer        |  second peer       |  third  peer
    // presenceManager1  |  presenceManager2  |  presenceManager3
    // agent1            |  agent2, agent3    |  agent4

    const builder = new TestBuilder();
    const peerId = PublicKey.random();

    // Initialize 3 peers.
    const presenceManager1 = new PresenceManager({ resendAnnounce: 50, offlineTimeout: 200 });
    const presenceManager2 = new PresenceManager({ resendAnnounce: 50, offlineTimeout: 200 });
    const presenceManager3 = new PresenceManager({ resendAnnounce: 50, offlineTimeout: 200 });

    // Connect first and second peer.
    const { agent1, agent2 } = await builder.createPipedAgents({ peerId2: peerId });
    presenceManager1.createExtension({ teleport: agent1.teleport! });
    presenceManager2.createExtension({ teleport: agent2.teleport! });

    // Connect second and third peer.
    const { agent1: agent3, agent2: agent4 } = await builder.createPipedAgents({ peerId1: peerId });
    presenceManager2.createExtension({ teleport: agent3.teleport! });
    presenceManager3.createExtension({ teleport: agent4.teleport! });

    // Check if first and third peers "see" each other.
    await waitForExpect(() => {
      expect(presenceManager1.getPeerStatesOnline().some((state) => state.peerId.equals(agent4.peerId))).toBeTruthy();
      expect(presenceManager3.getPeerStatesOnline().some((state) => state.peerId.equals(agent1.peerId))).toBeTruthy();
    }, 500);

    // Third peer got disconnected.
    await agent4.teleport?.close();

    // Check if third peer is offline for first and second peer.
    await waitForExpect(() => {
      expect(presenceManager1.getPeerStatesOnline().every((state) => !state.peerId.equals(agent4.peerId))).toBeTruthy();
      expect(presenceManager2.getPeerStatesOnline().every((state) => !state.peerId.equals(agent4.peerId))).toBeTruthy();
    }, 500);
  });

  test('cycle', async () => {
    // first peer        |  second peer       |  third  peer
    // presenceManager1  |  presenceManager2  |  presenceManager3
    // agent6  agent1    |  agent2, agent3    |  agent4, agent5
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
