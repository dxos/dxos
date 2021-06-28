//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { MessengerModel } from '@dxos/messenger-model';

import { BROWSER_ENV, NODE_ENV, Orchestrator } from '..';
import { APPEND_COMMAND, GET_ALL_COMMAND } from '../agents/test-agent';
import { AGENT_PATH } from './agent';
import '../testing/setup';

test('local source', async () => {
  const orchestrator = await Orchestrator.create({ local: true });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: AGENT_PATH });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: APPEND_COMMAND });
  await agent.sendCommand({ type: APPEND_COMMAND });

  const messages = await agent.sendCommand({ type: GET_ALL_COMMAND });

  expect(messages).toHaveLength(2);

  await orchestrator.destroy();
}).timeout(100_000).retries(2);

test.skip('remote source', async () => {
  const orchestrator = await Orchestrator.create({ local: false });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: AGENT_PATH, env: NODE_ENV });

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
