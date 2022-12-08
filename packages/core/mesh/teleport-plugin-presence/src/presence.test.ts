//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, latch, sleep } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

import { TestBuilder } from './testing';

describe('Presence', () => {
  test('Announce', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    await builder.connectAgents(agent1, agent2);

    await asyncTimeout(
      agent1.presence.updated.waitFor(
        () => agent1.presence.getPeers().length === 1 && agent1.presence.getPeers()[0].peerId.equals(agent2.peerId)
      ),
      200
    );
    await asyncTimeout(
      agent2.presence.updated.waitFor(
        () => agent2.presence.getPeers().length === 1 && agent2.presence.getPeers()[0].peerId.equals(agent1.peerId)
      ),
      200
    );
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
    await agent1.waitForAgentsToBeOnline([agent2, agent3], 200);
    await agent3.waitForAgentsToBeOnline([agent1, agent2], 200);
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
    await agent1.waitForAgentsToBeOnline([agent2, agent3], 200);
    await agent3.waitForAgentsToBeOnline([agent1, agent2], 200);

    // Third peer got disconnected.
    await agent3.destroy();

    // Check if third peer is offline for first and second peer.
    await agent1.waitForAgentsToBeOnline([agent2], 200);
  });

  test('Four peers connected', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    // Initialize 3 peers.
    const agent1 = builder.createAgent({ announceInterval: 10 });
    const agent2 = builder.createAgent({ announceInterval: 10 });
    const agent3 = builder.createAgent({ announceInterval: 10 });
    const agent4 = builder.createAgent({ announceInterval: 10 });

    {
      // Connect first and second peer.
      await builder.connectAgents(agent1, agent2);

      // Connect second and third peer.
      await builder.connectAgents(agent2, agent3);

      // Connect third and first peer.
      await builder.connectAgents(agent3, agent4);

      // Connect fourth and first peer.
      await builder.connectAgents(agent4, agent1);

      // first peer  --  second peer
      //      |                |
      // fourth peer  --  third peer

      // Run system for some time.
      await sleep(200);

      await agent1.waitForAgentsToBeOnline([agent2, agent3, agent4], 200);
    }

    {
      // Disconnect first and fourth peer.
      await builder.disconnectAgents(agent1, agent4);

      // first peer  --  second peer
      //                       |
      // fourth peer  --  third peer

      await agent1.waitForAgentsToBeOnline([agent2, agent3, agent4], 200);
    }

    {
      // Disconnect third and fourth peer.
      await builder.disconnectAgents(agent3, agent4);

      // first peer  --  second peer
      //                       |
      // fourth peer      third peer

      await agent1.waitForAgentsToBeOnline([agent2, agent3], 200);
    }

    {
      // Connect again first and fourth peer.
      await builder.connectAgents(agent3, agent4);

      // first peer  --  second peer
      //                       |
      // fourth peer  --  third peer

      await agent1.waitForAgentsToBeOnline([agent2, agent3, agent4], 200);
    }
  });
});
