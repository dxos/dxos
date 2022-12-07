//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { latch, sleep } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

import { TestAgent, TestBuilder } from './testing';
import { ComplexSet } from '@dxos/util';

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

  test('Four peers connected', async () => {
    // first peer  --  second peer
    //      |                |
    // third peer  --  fourth peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    // Initialize 3 peers.
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();
    const agent3 = builder.createAgent();
    const agent4 = builder.createAgent();

    // Connect first and second peer.
    await builder.connectAgents(agent1, agent2);

    // Connect second and third peer.
    await builder.connectAgents(agent2, agent3);

    // Connect third and first peer.
    await builder.connectAgents(agent3, agent4);

    // Connect fourth and first peer.
    await builder.connectAgents(agent4, agent1);

    const checkFirstAgentConnections = (agents: TestAgent[]) => {
      const connections = new Set(agent1.presence.getPeerStatesOnline().map((state) => state.peerId.toHex()));
      const expectedConnections = new Set(agents.map((agent) => agent.peerId.toHex()));
      expect(connections).toEqual(expectedConnections);
    };

    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().length).toEqual(3);
      checkFirstAgentConnections([agent2, agent3, agent4]);
    });

    // Disconnect first and fourth peer.
    await builder.disconnectAgents(agent1, agent4);

    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().length).toEqual(3);
      checkFirstAgentConnections([agent2, agent3, agent4]);
    });

    // Disconnect third and fourth peer.
    await builder.disconnectAgents(agent3, agent4);

    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().length).toEqual(2);
      checkFirstAgentConnections([agent2, agent3]);
      expect(agent4.presence.getPeerStatesOnline().length).toEqual(0);
    });

    // Connect again first and fourth peer.
    await builder.connectAgents(agent3, agent4);

    await waitForExpect(() => {
      expect(agent1.presence.getPeerStatesOnline().length).toEqual(3);
      checkFirstAgentConnections([agent2, agent3, agent4]);
    });
  });
});
