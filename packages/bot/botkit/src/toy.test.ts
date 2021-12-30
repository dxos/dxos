//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';

import { InProcessBotContainer } from './bot-container';
import { NodeContainer } from './bot-container/node-container';
import { BotController, BotFactory } from './bot-factory';
import { EchoBot, EmptyBot, TEST_ECHO_TYPE } from './bots';
import { Bot } from './proto/gen/dxos/bot';
import { BrokerSetup, ClientSetup, setupBroker, setupClient } from './testutils';

describe('In-Memory', () => {
  describe('No client', () => {
    it('Spawns a bot', async () => {
      let botInitialized = false;
      class TestBot extends EmptyBot {
        override async onInit () {
          botInitialized = true;
        }
      }

      const nm1 = new NetworkManager();
      const nm2 = new NetworkManager();
      const topic = PublicKey.random();

      const botContainer = new InProcessBotContainer(() => new TestBot());
      const botFactory = new BotFactory(botContainer);
      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);
      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);

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
      await botFactoryClient.stop();
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
      const { client, party } = clientSetup;

      const nm1 = new NetworkManager();
      const nm2 = new NetworkManager();
      const topic = PublicKey.random();

      const botContainer = new InProcessBotContainer(() => new EchoBot(TEST_ECHO_TYPE));
      const botFactory = new BotFactory(botContainer);
      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);
      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);

      const botHandle = await botFactoryClient.spawn(
        {},
        client,
        party
      );

      const command = PublicKey.random().asUint8Array();
      await botHandle.sendCommand(command);

      await party.database.waitForItem({
        type: TEST_ECHO_TYPE
      });

      const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
      const payload = item.model.getProperty('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

      await botFactoryClient.botFactory.Destroy();
      await botFactoryClient.stop();
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
      const { client, party } = clientSetup;
      const { config } = brokerSetup;

      const nm1 = new NetworkManager();
      const nm2 = new NetworkManager();
      const topic = PublicKey.random();

      const botContainer = new NodeContainer(['@swc-node/register']);
      const botFactory = new BotFactory(botContainer, config);
      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);
      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);

      const botHandle = await botFactoryClient.spawn(
        {
          localPath: require.resolve('./bots/start-echo-bot')
        },
        client,
        party
      );

      const command = PublicKey.random().asUint8Array();
      await botHandle.sendCommand(command);

      const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
      const payload = item.model.getProperty('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

      await botFactoryClient.botFactory.Destroy();
      await botFactoryClient.stop();
      botContainer.killAll();
    });
  });
});
