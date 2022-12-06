//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { describe, test } from '@dxos/test';

import { PresenceManager } from './presence-manager';
import { TestBuilder } from './testing';

describe('PresenceManager', () => {
  test('Announce', async () => {
    const builder = new TestBuilder();
    const { agent1, agent2 } = await builder.createPipedAgents();

    const presenceManager1 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 1000 });
    presenceManager1.createExtension({ teleport: agent1.teleport! });

    const presenceManager2 = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 1000 });
    presenceManager2.createExtension({ teleport: agent2.teleport! });

    await waitForExpect(() => {
      expect(presenceManager1.getPeerStates().length).toEqual(1);
      expect(presenceManager2.getPeerStates().length).toEqual(1);
      expect(presenceManager1.getPeerStates()[0].peerId).toEqual(agent2.peerId);
      expect(presenceManager2.getPeerStates()[0].peerId).toEqual(agent1.peerId);
    });
  });

  test('Reannounce', async () => {
    const builder = new TestBuilder();
    const { agent1, agent2 } = await builder.createPipedAgents();
    const presenceManager = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 1000 });
    presenceManager.createExtension({ teleport: agent1.teleport! });

    const received: PeerState[] = [];
    agent2.initializePresence({
      connections: [agent1.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState: PeerState) => {
        expect(peerState.peerId.equals(agent1.peerId)).toBeTruthy();
        expect(peerState.connections![0].equals(agent2.peerId)).toBeTruthy();
        received.push(peerState);
      }
    });
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
});
