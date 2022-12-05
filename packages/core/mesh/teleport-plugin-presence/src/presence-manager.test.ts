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
  test('announce', async () => {
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

  test.only('Presence gets indirect announces', async () => {
    const builder = new TestBuilder();
    const peerId = PublicKey.random();
    const { agent1, agent2 } = await builder.createPipedAgents({ peerId2: peerId });
    const received1: PeerState[] = [];
    agent1.initializePresence({
      connections: [agent2.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState) => {
        expect(peerState.peerId).toEqual(peerId);
        console.log('received1', peerState);
        received1.push(peerState);
      }
    });

    const { agent1: agent3, agent2: agent4 } = await builder.createPipedAgents({ peerId1: peerId });

    const received4: PeerState[] = [];
    agent4.initializePresence({
      connections: [agent3.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState) => {
        expect(peerState.peerId).toEqual(peerId);
        console.log('received4', peerState);
        received4.push(peerState);
      }
    });

    const presenceManager = new PresenceManager({ resendAnnounce: 100, offlineTimeout: 1000 });
    presenceManager.createExtension({ teleport: agent2.teleport! });
    presenceManager.createExtension({ teleport: agent3.teleport! });
    console.log('agent1', agent1.peerId);
    console.log('agent2', agent2.peerId);
    console.log('agent3', agent3.peerId);
    console.log('agent4', agent4.peerId);
    await waitForExpect(() => {
      expect(received1.some((state) => state.peerId.equals(agent4.peerId))).toBeTruthy();
      expect(received4.some((state) => state.peerId.equals(agent1.peerId))).toBeTruthy();
    }, 2_000);
  });
});
