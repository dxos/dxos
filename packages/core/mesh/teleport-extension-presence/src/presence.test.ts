//
// Copyright 2022 DXOS.org
//

import { latch, sleep } from '@dxos/async';
import { TestBuilder } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';
import { TestAgent } from './testing';


describe('Presence', () => {
  test('Two peers see each other', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const [agent1, agent2] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await agent1.waitForExactAgentsOnline([agent2], 200);
    await agent2.waitForExactAgentsOnline([agent1], 200);
  });

  test('Reannounce', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const [agent1, agent2] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

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

    const [agent1, agent2, agent3] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await builder.connect(agent2, agent3);

    // Check if first and third peers "see" each other.
    await agent1.waitForExactAgentsOnline([agent2, agent3], 200);
    await agent3.waitForExactAgentsOnline([agent1, agent2], 200);
  });

  test('One connection drops after some time', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const [agent1, agent2, agent3] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await builder.connect(agent2, agent3);

    // Check if first and third peers "see" each other.
    await agent1.waitForExactAgentsOnline([agent2, agent3], 200);
    await agent3.waitForExactAgentsOnline([agent1, agent2], 200);

    await agent3.destroy();

    // Check if third peer is offline for first and second peer.
    await agent1.waitForExactAgentsOnline([agent2], 200);
  });

  test('Four peers connected', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const [agent1, agent2, agent3, agent4] = builder.createPeers({ factory: () => new TestAgent({ announceInterval: 10, offlineTimeout: 50 }) });

    {
      await builder.connect(agent1, agent2);
      await builder.connect(agent2, agent3);
      await builder.connect(agent3, agent4);
      await builder.connect(agent4, agent1);

      //
      // first peer  --  second peer
      //      |                |
      // fourth peer  --  third peer
      //

      // Run system for some time.
      await sleep(200);

      await agent1.waitForExactAgentsOnline([agent2, agent3, agent4], 200);
    }

    {
      await builder.disconnect(agent1, agent4);

      //
      // first peer  --  second peer
      //                       |
      // fourth peer  --  third peer
      //

      await agent1.waitForExactAgentsOnline([agent2, agent3, agent4], 200);
    }

    {
      await builder.disconnect(agent3, agent4);

      //
      // first peer  --  second peer
      //                       |
      // fourth peer      third peer
      //

      await agent1.waitForExactAgentsOnline([agent2, agent3], 200);
    }

    {
      await builder.connect(agent3, agent4);

      //
      // first peer  --  second peer
      //                       |
      // fourth peer  --  third peer
      //

      await agent1.waitForExactAgentsOnline([agent2, agent3, agent4], 200);
    }
  });
});
