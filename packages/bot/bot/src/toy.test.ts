//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { createLinkedPorts } from '@dxos/rpc';

import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { InMemoryBot } from './bot-handle';
import { Bot } from './proto/gen/dxos/bot';
import { BotFactoryAgent } from './testutils';

describe('In-Memory', () => {
  it('Spawns a bot', async () => {
    const [agentPort, botControllerPort] = createLinkedPorts();
    const agent = new BotFactoryAgent(agentPort);
    const botController = new BotController(new BotFactory(() => new InMemoryBot()), botControllerPort);
    await Promise.all([
      botController.start(),
      agent.start()
    ]);
    await agent.botFactory.SpawnBot({});
    const { bots } = await agent.botFactory.GetBots({});
    expect(bots).toBeDefined();
    expect(bots).toHaveLength(1);
    expect(bots![0].status).toBeDefined();
    expect(bots![0].status).toBe(Bot.Status.RUNNING);
  });
});
