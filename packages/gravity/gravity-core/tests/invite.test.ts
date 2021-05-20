//
// Copyright 2020 DXOS.org
//

import { waitForCondition } from '@dxos/async';
import { MessengerModel } from '@dxos/messenger-model';

import { /* BROWSER_ENV, NODE_ENV, */ Orchestrator } from '../src';
import { APPEND_COMMAND, GET_ALL_COMMAND } from '../src/agents/test-agent';

jest.setTimeout(100_000);

test.skip('invite two agents to a party', async () => {
  const orchestrator = await Orchestrator.create({ local: true });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  const agent1 = await orchestrator.startAgent({ botPath: './src/test-agent.js' });
  const agent2 = await orchestrator.startAgent({ botPath: './src/test-agent.js' });

  await agent1.sendCommand({ type: APPEND_COMMAND });
  await agent2.sendCommand({ type: APPEND_COMMAND });

  await waitForCondition(async () => (await agent1.sendCommand({ type: GET_ALL_COMMAND })).length === 2);
  await waitForCondition(async () => (await agent2.sendCommand({ type: GET_ALL_COMMAND })).length === 2);

  const messages1 = await agent1.sendCommand({ type: GET_ALL_COMMAND });
  const messages2 = await agent2.sendCommand({ type: GET_ALL_COMMAND });

  expect(messages1).toHaveLength(2);
  expect(messages2).toHaveLength(2);

  await orchestrator.destroy();
});
