//
// Copyright 2020 DXOS.org
//

import path from 'path';

import { MessengerModel } from '@dxos/messenger-model';

import { BROWSER_ENV, NODE_ENV, Orchestrator } from '../src';

jest.setTimeout(100_000);

test('local source', async () => {
  const orchestrator = await Orchestrator.create({ local: true });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: path.join(__dirname, '../src/test-agent.ts') });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: 'append' });
  await agent.sendCommand({ type: 'append' });

  const messages = await agent.sendCommand({ type: 'get-all' });

  expect(messages).toHaveLength(2);

  await orchestrator.destroy();
});

test.skip('remote source', async () => {
  const orchestrator = await Orchestrator.create({ local: false });

  orchestrator.client.registerModel(MessengerModel);

  await orchestrator.start();

  const agent = await orchestrator.startAgent({ botPath: './src/test-agent.js', env: NODE_ENV });

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  await agent.sendCommand({ type: 'append' });

  await orchestrator.destroy();
});

test.skip('browser', async () => {
  const orchestrator = await Orchestrator.create({ local: false });

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
