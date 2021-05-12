//
// Copyright 2020 DXOS.org
//

import { MessengerModel } from '@dxos/messenger-model';

import { Agent } from '../src/agent';
import { BROWSER_ENV, /* NODE_ENV, */ Orchestrator } from '../src/orchestrator';

jest.setTimeout(100_000);

test.skip('multiple agents', async () => {
  const numAgents = 5;
  const numMessages = 10;

  const orchestrator = new Orchestrator({ local: true });
  orchestrator.client.registerModel(MessengerModel);
  await orchestrator.start();

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  const agents: Agent[] = [];
  for (let i = 0; i < numAgents; i++) {
    agents.push(await orchestrator.startAgent({ botPath: './src/test-agent.js', env: BROWSER_ENV }));
  }

  await Promise.all(agents.map(async agent => {
    for (let i = 0; i < numMessages; i++) {
      await agent.sendCommand({ type: 'append' });
    }
  }));

  await Promise.all(agents.map(agent => new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(async () => {
      try {
        const messages = await agent.sendCommand({ type: 'get-all' });
        if (messages.length === numAgents * numMessages) {
          clearTimeout(timeoutId);
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    }, 1000);
  })));

  await orchestrator.destroy();
});
