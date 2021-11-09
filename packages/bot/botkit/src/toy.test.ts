//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';

import { Client } from '@dxos/client';
import { createKeyPair, PublicKey } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { createLinkedPorts } from '@dxos/rpc';

import { InProcessBotContaier } from './bot-container';
import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { Bot } from './proto/gen/dxos/bot';
import { BotFactoryAgent, ClientAgent } from './testutils';
import { decodeInvitation, encodeInvitation } from './testutils/intivitations';

const ECHO_TYPE = 'bot/text';

describe('In-Memory', () => {
  it('Spawns a bot', async () => {
    const [agentPort, botControllerPort] = createLinkedPorts();

    let botInitialized = false;

    const agent = new BotFactoryAgent(agentPort);

    const botContainer = new InProcessBotContaier(() => {
      return {
        Initialize: async () => {
          botInitialized = true;
          return {};
        },
        Command: async (request) => {
          return { response: request.command };
        }
      };
    });
    const botFactory = new BotFactory(botContainer);

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

    agent.stop();
  });

  it('Spawns a bot with a client', async () => {
    const [agentPort, botControllerPort] = createLinkedPorts();
    const botKeyPair = createKeyPair();

    const botContainer = new InProcessBotContaier(() => {
      const client = new Client();
      let party: Party | undefined;

      return {
        Initialize: async (request) => {
          await client.initialize();
          await client.echo.halo.createIdentity({ ...botKeyPair });
          await client.echo.halo.create('Bot');

          if (request.invitation?.data) {
            const invitation = decodeInvitation(request.invitation.data);
            party = await client.echo.joinParty(invitation);
          }

          return {};
        },
        Command: async (request) => {
          if (!party) {
            throw new Error('Bot is not initialized');
          }

          if (!request.command) {
            // TODO(yivlad): Serves as a stop command.
            await client.destroy();
            return {};
          }

          await party.database.createItem({
            model: ObjectModel,
            type: ECHO_TYPE,
            props: {
              text: request.command?.toString()
            }
          });

          return { response: request.command };
        }
      };
    });

    const botFactory = new BotFactory(botContainer);

    const botController = new BotController(botFactory, botControllerPort);
    const agent = new ClientAgent(agentPort);

    await Promise.all([
      botController.start(),
      agent.start()
    ]);
    assert(agent.party);

    const invitation = await agent.party.createOfflineInvitation(PublicKey.from(botKeyPair.publicKey));
    const { id } = await agent.botFactory.SpawnBot({
      invitation: {
        data: encodeInvitation(invitation)
      }
    });
    assert(id);

    const text = PublicKey.random().asUint8Array();
    await agent.botFactory.SendCommand({
      botId: id,
      command: text
    });

    await agent.party.database.waitForItem({
      type: ECHO_TYPE
    });

    await agent.botFactory.SendCommand({
      botId: id
    });

    await agent.client.destroy();
    agent.stop();
  });
});
