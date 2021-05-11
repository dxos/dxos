//
// Copyright 2020 DXOS.org
//

import path from 'path';

import { MessengerModel } from '@dxos/messenger-model';

import { BROWSER_ENV, NODE_ENV, Orchestrator } from '../src/orchestrator';

jest.setTimeout(100 * 1000);

test('local source', async () => {
  const orchestrator = new Orchestrator({ local: true });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: path.join(__dirname, '../src/test-agent.mjs') });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: 'append' });
  await agent.sendCommand({ type: 'append' });

  const messages = await agent.sendCommand({ type: 'get-all' });

  expect(messages).toHaveLength(2);

  await orchestrator.destroy();
});

test.skip('remote source', async () => {
  const orchestrator = new Orchestrator({ local: false });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: './src/test-agent.js', env: NODE_ENV });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: 'append' });

  await orchestrator.destroy();
});

test.skip('browser', async () => {
  const orchestrator = new Orchestrator({ local: false });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: './src/test-agent.js', env: BROWSER_ENV });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: 'append' });
  await agent.sendCommand({ type: 'append' });

  const messages = await agent.sendCommand({ type: 'get-all' });

  expect(messages).toHaveLength(2);

  await orchestrator.destroy();
});
