//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/crypto';
import { createLinkedPorts } from '@dxos/rpc';

import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { BotHandle } from './bot-handle';
import { Bot } from './proto/gen/dxos/bot';
import { BotFactoryAgent, InMemoryCustomizableBot } from './testutils';

describe('In-Memory', () => {
  it('Spawns a bot', async () => {
    const [agentPort, botControllerPort] = createLinkedPorts();

    let botInitialized = false;

    const agent = new BotFactoryAgent(agentPort);
    const botFactory = new BotFactory(() => {
      const [botHandlePort, botPort] = createLinkedPorts();
      const bot = new InMemoryCustomizableBot(botPort, {
        Initialize: async () => {
          botInitialized = true;
          return {};
        },
        Command: async (request) => {
          return { response: request.command };
        }
      });

      void bot.open();

      return new BotHandle(botHandlePort);
    });

    const botController = new BotController(botFactory, botControllerPort);

    await Promise.all([
      botController.start(),
      agent.start()
    ]);

    const { id: botId } = await agent.botFactory.SpawnBot({});
    expect(botId).toBeDefined();

    const { bots } = await agent.botFactory.GetBots({});
    expect(bots).toHaveLength(1);
    expect(bots![0].status).toBe(Bot.Status.RUNNING);
    expect(botInitialized).toBe(true);

    const command = PublicKey.random().asUint8Array();
    const repsonse = await agent.botFactory.SendCommand({ botId, command });

    expect(repsonse.response).toBeDefined();
    expect(Buffer.from(command).equals(Buffer.from(repsonse.response!))).toBe(true);
  });
});
