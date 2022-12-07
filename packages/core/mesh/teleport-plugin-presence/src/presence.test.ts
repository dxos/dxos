//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { latch } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

import { TestBuilder } from './testing';

describe('Presence', () => {
  test('Announce', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    await builder.connectAgents(agent1, agent2);

    await waitForExpect(() => {
      expect(agent1.presence.getPeerStates().length).toEqual(1);
      expect(agent2.presence.getPeerStates().length).toEqual(1);
      expect(agent1.presence.getPeerStates()[0].peerId).toEqual(agent2.peerId);
      expect(agent2.presence.getPeerStates()[0].peerId).toEqual(agent1.peerId);
    });
  });

  test('Reannounce', async () => {
    afterTest(() => builder.destroy());
    const builder = new TestBuilder();

    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    await builder.connectAgents(agent1, agent2);

    const [announced3Times, inc] = latch({ count: 3 });
    agent1.presence.updated.on(() => {
      inc();
    });

    await announced3Times();
  });

  test('Gets indirect announces', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    // Initialize 3 peers.
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    const agent3 = builder.createAgent();

    // Connect first and second peer.
    await builder.connectAgents(agent1, agent2);

    // Connect second and third peer.
    await builder.connectAgents(agent2, agent3);

    // Check if first and third peers "see" each other.
    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().some((state) => state.peerId.equals(agent3.peerId))).toBeTruthy();
      expect(agent3.presence.getPeerStatesOnline().some((state) => state.peerId.equals(agent1.peerId))).toBeTruthy();
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

    // Connect first and second peer.
    await builder.connectAgents(agent1, agent2);

    // Connect second and third peer.
    await builder.connectAgents(agent2, agent3);

    // Check if first and third peers "see" each other.
    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().some((state) => state.peerId.equals(agent3.peerId))).toBeTruthy();
      expect(agent3.presence.getPeerStatesOnline().some((state) => state.peerId.equals(agent1.peerId))).toBeTruthy();
    }, 500);

    // Third peer got disconnected.
    await agent3.destroy();

    // Check if third peer is offline for first and second peer.
    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().every((state) => !state.peerId.equals(agent3.peerId))).toBeTruthy();
      expect(agent2.presence.getPeerStatesOnline().every((state) => !state.peerId.equals(agent3.peerId))).toBeTruthy();
    }, 500);
  });

  test('Announces not get sent endlessly in a loop', async () => {
    // first peer  <->  second peer  <->  third  peer  <-> first peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    // Initialize 3 peers.
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    const agent3 = builder.createAgent();

    // Connect first and second peer.
    await builder.connectAgents(agent1, agent2);

    // Connect second and third peer.
    await builder.connectAgents(agent2, agent3);

    // Connect third and first peer.
    await builder.connectAgents(agent3, agent1);

    const received1: string[] = [];

    agent1.presence.newPeerState.on((peerState) => {
      received1.push(peerState.messageId.toHex());
    });

    await waitForExpect(() => {
      expect(received1.length).toEqual(20);
      expect(
        received1.every((peerId, _, array) => array.filter((value) => value === peerId).length === 1)
      ).toBeTruthy();
    });
  });
});
