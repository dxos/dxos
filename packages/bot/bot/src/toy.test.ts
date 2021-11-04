//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { createLinkedPorts } from '@dxos/rpc';

import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { BotHandle } from './bot-handle';
import { Bot } from './proto/gen/dxos/bot';
import { BotFactoryAgent, InMemoryCustomizableBot } from './testutils';

describe('In-Memory', () => {
  it('Spawns a bot', async () => {
    const [agentPort, botControllerPort] = createLinkedPorts();
    const [botHandlePort, botPort] = createLinkedPorts();

    const agent = new BotFactoryAgent(agentPort);
    const botFactory = new BotFactory(() => new BotHandle(botHandlePort));
    const botController = new BotController(botFactory, botControllerPort);

    await Promise.all([
      botController.start(),
      agent.start()
    ]);

    let botInitialized = false;
    let commandReceived = false;
    const bot = new InMemoryCustomizableBot(botPort, {
      Initialize: async () => {
        botInitialized = true;
        return {};
      },
      Command: async () => {
        commandReceived = true;
        return {};
      }
    });
    void bot.open();

    const { id: botId } = await agent.botFactory.SpawnBot({});
    expect(botId).toBeDefined();

    const { bots } = await agent.botFactory.GetBots({});
    expect(bots).toBeDefined();
    expect(bots).toHaveLength(1);
    expect(bots![0].status).toBeDefined();
    expect(bots![0].status).toBe(Bot.Status.RUNNING);
    expect(botInitialized).toBe(true);

    await agent.botFactory.SendCommand({ botId });

    expect(commandReceived).toBe(true);
  });
});
