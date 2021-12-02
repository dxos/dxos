//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';

import { PublicKey } from '@dxos/crypto';
import { createLinkedPorts } from '@dxos/rpc';

import { InProcessBotContainer } from './bot-container';
import { NodeContainer } from './bot-container/node-container';
import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { EchoBot, EmptyBot, TEST_ECHO_TYPE } from './bots';
import { Bot } from './proto/gen/dxos/bot';
import { BrokerSetup, ClientSetup, setupBroker, setupClient, BotFactoryClient } from './testutils';

describe('In-Memory', () => {
  describe('No client', () => {
    it('Spawns a bot', async () => {
      const [agentPort, botControllerPort] = createLinkedPorts();

      let botInitialized = false;
      class TestBot extends EmptyBot {
        override async onInit () {
          botInitialized = true;
        }
      }

      const botFactoryClient = new BotFactoryClient(agentPort);
      const botContainer = new InProcessBotContainer(() => new TestBot());
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
      const response = await botFactoryClient.botFactory.SendCommand({ botId, command });

      expect(response.response).toBeDefined();
      expect(Buffer.from(command).equals(Buffer.from(response.response!))).toBe(true);

      await botFactoryClient.botFactory.Destroy();
      botFactoryClient.stop();
    });
  });

  describe('With a DXOS client', () => {
    let clientSetup: ClientSetup;

    beforeEach(async () => {
      clientSetup = await setupClient();
    });

    afterEach(async () => {
      await clientSetup.client.destroy();
    });

    it('Spawns a bot with a client', async () => {
      const { party, invitation, secret } = clientSetup;
      const [agentPort, botControllerPort] = createLinkedPorts();

      const botContainer = new InProcessBotContainer(() => new EchoBot(TEST_ECHO_TYPE));
      const botFactory = new BotFactory(botContainer);
      const botController = new BotController(botFactory, botControllerPort);
      const botFactoryClient = new BotFactoryClient(agentPort);

      await Promise.all([
        botController.start(),
        botFactoryClient.start()
      ]);

      const { id } = await botFactoryClient.botFactory.SpawnBot({
        invitation: {
          invitationCode: invitation,
          secret
        }
      });
      assert(id);

      const text = PublicKey.random().asUint8Array();
      await botFactoryClient.botFactory.SendCommand({
        botId: id,
        command: text
      });

      await party.database.waitForItem({
        type: TEST_ECHO_TYPE
      });

      const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
      const payload = item.model.getProperty('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(text).toString());

      await botFactoryClient.botFactory.Destroy();
      botFactoryClient.stop();
    });
  });
});

describe('Node', () => {
  describe('With a DXOS client', () => {
    let clientSetup: ClientSetup;
    let brokerSetup: BrokerSetup;

    before(async () => {
      brokerSetup = await setupBroker();
    });

    after(async () => {
      await brokerSetup.broker.stop();
    });

    beforeEach(async () => {
      clientSetup = await setupClient(brokerSetup.config);
    });

    afterEach(async () => {
      await clientSetup.client.destroy();
    });

    it('Spawns an echo-bot', async () => {
      const { party, invitation, secret } = clientSetup;
      const { config } = brokerSetup;
      const [agentPort, botControllerPort] = createLinkedPorts();

      const botContainer = new NodeContainer(['ts-node/register/transpile-only']);
      const botFactory = new BotFactory(botContainer, config);
      const botController = new BotController(botFactory, botControllerPort);
      const botFactoryClient = new BotFactoryClient(agentPort);

      await Promise.all([
        botController.start(),
        botFactoryClient.start()
      ]);

      const { id } = await botFactoryClient.botFactory.SpawnBot({
        package: {
          localPath: require.resolve('./bots/start-echo-bot')
        },
        invitation: {
          invitationCode: invitation,
          secret
        }
      });
      assert(id);

      const text = PublicKey.random().asUint8Array();
      await botFactoryClient.botFactory.SendCommand({
        botId: id,
        command: text
      });

      const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
      const payload = item.model.getProperty('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(text).toString());

      await botFactoryClient.botFactory.Destroy();
      botFactoryClient.stop();
      botContainer.killAll();
    });
  });
});
