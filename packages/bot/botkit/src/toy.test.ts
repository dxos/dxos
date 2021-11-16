//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';

import { Client, decodeInvitation, encodeInvitation } from '@dxos/client';
import { SecretProvider, SecretValidator } from '@dxos/credentials';
import { createKeyPair, PublicKey } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { createLinkedPorts } from '@dxos/rpc';

import { InProcessBotContainer } from './bot-container';
import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { Bot } from './proto/gen/dxos/bot';
import { BotFactoryClient } from './testutils';

const ECHO_TYPE = 'bot/text';

describe('In-Memory', () => {
  describe('No client', () => {
    it('Spawns a bot', async () => {
      const [agentPort, botControllerPort] = createLinkedPorts();

      let botInitialized = false;

      const botFactoryClient = new BotFactoryClient(agentPort);

      const botContainer = new InProcessBotContainer(() => {
        return {
          Initialize: async () => {
            botInitialized = true;
          },
          Command: async (request) => {
            return { response: request.command };
          },
          Stop: async () => {}
        };
      });
      const botFactory = new BotFactory(botContainer);

      const botController = new BotController(botFactory, botControllerPort);

      await Promise.all([
        botController.start(),
        botFactoryClient.start()
      ]);

      const { id: botId } = await botFactoryClient.botFactory.SpawnBot({});
      expect(botId).toBeDefined();

      const { bots } = await botFactoryClient.botFactory.GetBots();
      expect(bots).toHaveLength(1);
      expect(bots![0].status).toBe(Bot.Status.RUNNING);
      expect(botInitialized).toBe(true);

      const command = PublicKey.random().asUint8Array();
      const repsonse = await botFactoryClient.botFactory.SendCommand({ botId, command });

      expect(repsonse.response).toBeDefined();
      expect(Buffer.from(command).equals(Buffer.from(repsonse.response!))).toBe(true);

      await botFactoryClient.botFactory.Destroy();
      botFactoryClient.stop();
    });
  });

  describe('With a DXOS client', () => {
    let client: Client;
    let party: Party;

    beforeEach(async () => {
      client = new Client();
      await client.initialize();
      await client.echo.halo.createIdentity({ ...createKeyPair() });
      await client.echo.halo.create('Agent');
      party = await client.echo.createParty();
    });

    afterEach(async () => {
      await client.destroy();
    });

    it('Spawns a bot with a client', async () => {
      const [agentPort, botControllerPort] = createLinkedPorts();

      const botContainer = new InProcessBotContainer(() => {
        const client = new Client();
        let party: Party | undefined;

        return {
          Initialize: async (request) => {
            await client.initialize();
            await client.echo.halo.createIdentity({ ...createKeyPair() });
            await client.echo.halo.create('Bot');

            if (request.invitation?.data) {
              assert(request.secret, 'Secret must be provided with invitation');
              const invitation = decodeInvitation(request.invitation.data);
              const botSecretProvider: SecretProvider = async () => Buffer.from(request.secret!);
              party = await client.echo.joinParty(invitation, botSecretProvider);
            }
          },
          Command: async (request) => {
            assert(party, 'Bot is not initialized');
            assert(request.command, 'Command must be provided');

            await party.database.createItem({
              model: ObjectModel,
              type: ECHO_TYPE,
              props: {
                text: PublicKey.from(request.command).toString()
              }
            });

            return { response: request.command };
          },
          Stop: async () => {
            await client.destroy();
          }
        };
      });

      const botFactory = new BotFactory(botContainer);

      const botController = new BotController(botFactory, botControllerPort);

      const botFactoryClient = new BotFactoryClient(agentPort);

      await Promise.all([
        botController.start(),
        botFactoryClient.start()
      ]);

      const partySecretString = PublicKey.random().toString();
      const partySecret = Buffer.from(partySecretString);
      const secretProvider: SecretProvider = async () => partySecret;
      const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(partySecret);

      const invitation = await party.createInvitation({ secretProvider, secretValidator });
      const { id } = await botFactoryClient.botFactory.SpawnBot({
        invitation: {
          data: encodeInvitation(invitation)
        },
        secret: partySecretString
      });
      assert(id);

      const text = PublicKey.random().asUint8Array();
      await botFactoryClient.botFactory.SendCommand({
        botId: id,
        command: text
      });

      await party.database.waitForItem({
        type: ECHO_TYPE
      });

      const items = party.database.select(s => s
        .filter({ type: ECHO_TYPE })
        .items
      ).getValue();

      expect(items.length).toBe(1);
      const savedText = items[0].model.getProperty('text');
      expect(savedText).toBe(PublicKey.from(text).toString());

      await botFactoryClient.botFactory.Destroy();
      botFactoryClient.stop();
    });
  });
});
