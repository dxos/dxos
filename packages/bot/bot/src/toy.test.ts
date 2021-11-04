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
import { PublicKey } from '../../../halo/credentials/node_modules/@dxos/crypto/dist/src';

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
    let commandReceived: Uint8Array | undefined;
    const bot = new InMemoryCustomizableBot(botPort, {
      Initialize: async () => {
        botInitialized = true;
        return {};
      },
      Command: async (request) => {
        commandReceived = request.command;
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

    const command = PublicKey.random().asUint8Array();
    await agent.botFactory.SendCommand({ botId, command });

    expect(commandReceived).toBeDefined();
    expect(Buffer.from(command).equals(Buffer.from(commandReceived!))).toBe(true);
  });
});
