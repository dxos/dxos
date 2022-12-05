//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { latch } from '@dxos/async';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { describe, test } from '@dxos/test';

import { TestBuilder } from './testing';

describe('PresenceExtension', () => {
  test('Two peers announce each other', async () => {
    const builder = new TestBuilder();
    const { agent1, agent2 } = await builder.createPipedAgents();

    const received1: PeerState[] = [];
    agent1.initializePresence({
      connections: [agent2.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState: PeerState) => {
        received1.push(peerState);
      }
    });

    const received2: PeerState[] = [];
    agent2.initializePresence({
      connections: [agent1.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState: PeerState) => {
        received2.push(peerState);
      }
    });
    await waitForExpect(() => expect(received1[0].peerId).toEqual(agent2.peerId));
    await waitForExpect(() => expect(received2[0].peerId).toEqual(agent1.peerId));
  });

  test('Peer reannounces itself by interval', async () => {
    const builder = new TestBuilder();
    const { agent1, agent2 } = await builder.createPipedAgents();

    agent1.initializePresence({
      connections: [agent2.peerId],
      resendAnnounce: 100,
      onAnnounce: async () => {}
    });

    const received: PeerState[] = [];
    const [announcedTwice, inc] = latch({ count: 2 });
    agent2.initializePresence({
      connections: [agent1.peerId],
      resendAnnounce: 100,
      onAnnounce: async (peerState: PeerState) => {
        expect(peerState.peerId).toEqual(agent1.peerId);
        expect(peerState.connections).toEqual([agent2.peerId]);
        received.push(peerState);
        inc();
      }
    });

    await announcedTwice();
  });
});
