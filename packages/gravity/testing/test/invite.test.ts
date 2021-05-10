import { MessengerModel } from '@dxos/messenger-model';
import { waitForCondition } from '@dxos/util';

import { BROWSER_ENV, NODE_ENV, Orchestrator } from '../src/orchestrator';

jest.setTimeout(100 * 1000);

test('invite two agents to a party', async () => {
  const orchestrator = new Orchestrator({ local: true });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  const agent1 = await orchestrator.startAgent({ botPath: './src/test-agent.js' });
  const agent2 = await orchestrator.startAgent({ botPath: './src/test-agent.js' });

  await agent1.sendCommand({ type: 'append' });
  await agent2.sendCommand({ type: 'append' });

  await waitForCondition(async () => (await agent1.sendCommand({ type: 'get-all' })).length === 2)
  await waitForCondition(async () => (await agent2.sendCommand({ type: 'get-all' })).length === 2)

  const messages1 = await agent1.sendCommand({ type: 'get-all' });
  const messages2 = await agent2.sendCommand({ type: 'get-all' });

  expect(messages1).toHaveLength(2);
  expect(messages2).toHaveLength(2);

  await orchestrator.destroy();
});
