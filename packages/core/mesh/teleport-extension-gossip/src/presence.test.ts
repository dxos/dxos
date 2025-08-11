//
// Copyright 2022 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { latch, sleep } from '@dxos/async';
import { TestBuilder } from '@dxos/teleport/testing';

import { TestAgent } from './testing';

describe('Presence', () => {
  test('Two peers see each other', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
    const [agent1, agent2] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await agent1.waitForAgentsOnline([agent2], TIMEOUT);
    await agent2.waitForAgentsOnline([agent1], TIMEOUT);
  });

  test('Reannounce', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
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
    onTestFinished(() => builder.destroy());

    const [agent1, agent2, agent3] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await builder.connect(agent2, agent3);

    // Check if first and third peers "see" each other.
    await agent1.waitForAgentsOnline([agent2, agent3], TIMEOUT);
    await agent3.waitForAgentsOnline([agent1, agent2], TIMEOUT);
  });

  test('One connection drops after some time', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());

    const [agent1, agent2, agent3] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await builder.connect(agent2, agent3);

    // Check if first and third peers "see" each other.
    await agent1.waitForAgentsOnline([agent2, agent3], TIMEOUT);
    await agent3.waitForAgentsOnline([agent1, agent2], TIMEOUT);

    await agent3.destroy();

    // Check if third peer is offline for first and second peer.
    await agent1.waitForAgentsOnline([agent2], TIMEOUT);
  });

  test('Four peers connected', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());

    const [agent1, agent2, agent3, agent4] = builder.createPeers({
      factory: () => new TestAgent({ announceInterval: 10, offlineTimeout: 50 }),
    });

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

      await agent1.waitForAgentsOnline([agent2, agent3, agent4], TIMEOUT);
    }

    {
      await builder.disconnect(agent1, agent4);

      //
      // first peer  --  second peer
      //                       |
      // fourth peer  --  third peer
      //

      await agent1.waitForAgentsOnline([agent2, agent3, agent4], TIMEOUT);
    }

    {
      await builder.disconnect(agent3, agent4);

      //
      // first peer  --  second peer
      //                       |
      // fourth peer      third peer
      //

      await agent1.waitForAgentsOnline([agent2, agent3], TIMEOUT);
    }

    {
      await builder.connect(agent3, agent4);

      //
      // first peer  --  second peer
      //                       |
      // fourth peer  --  third peer
      //

      await agent1.waitForAgentsOnline([agent2, agent3, agent4], TIMEOUT);
    }
  });
});

const TIMEOUT = 1000;
