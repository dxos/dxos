//
// Copyright 2020 DXOS.org
//

import path from 'path';

import { MessengerModel } from '@dxos/messenger-model';

import { BROWSER_ENV, NODE_ENV, Orchestrator } from '../src';
import { APPEND_COMMAND, GET_ALL_COMMAND } from '../src/agents/test-agent';

jest.setTimeout(100_000);

test.skip('local source', async () => {
  const orchestrator = await Orchestrator.create({ local: true });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: path.join(__dirname, '../src/agents/test-agent.ts') });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: APPEND_COMMAND });
  await agent.sendCommand({ type: APPEND_COMMAND });

  const messages = await agent.sendCommand({ type: GET_ALL_COMMAND });

  expect(messages).toHaveLength(2);

  await orchestrator.destroy();
});

test.skip('remote source', async () => {
  const orchestrator = await Orchestrator.create({ local: false });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: path.join(__dirname, '../src/agents/test-agent.ts'), env: NODE_ENV });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: APPEND_COMMAND });

  await orchestrator.destroy();
});

test.skip('browser', async () => {
  const orchestrator = await Orchestrator.create({ local: false });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: './src/agents/test-agent.js', env: BROWSER_ENV });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: APPEND_COMMAND });
  await agent.sendCommand({ type: APPEND_COMMAND });

  const messages = await agent.sendCommand({ type: GET_ALL_COMMAND });

  expect(messages).toHaveLength(2);

  await orchestrator.destroy();
});
