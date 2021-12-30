//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';
import { IRegistryClient } from '@dxos/registry-client';

import { InProcessBotContainer } from './bot-container';
import { NodeContainer } from './bot-container/node-container';
import { BotController, BotFactory, DXNSContentLoader } from './bot-factory';
import { EchoBot, EmptyBot, TEST_ECHO_TYPE } from './bots';
import { Bot } from './proto/gen/dxos/bot';
import { BrokerSetup, ClientSetup, createMockRegistryWithBots, IPFS, MockContentLoader, MOCK_BOT_HASH, setupBroker, setupClient, setupIPFSWithBot } from './testutils';
import { randomInt } from '@dxos/util';

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
      const contentLoader = new MockContentLoader();
      const botFactory = new BotFactory(contentLoader, botContainer);
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
      const contentLoader = new MockContentLoader();
      const botFactory = new BotFactory(contentLoader, botContainer);
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

describe.only('Node', () => {
  describe('With a DXOS client', () => {
    let clientSetup: ClientSetup;
    let brokerSetup: BrokerSetup;
    let registry: IRegistryClient;
    let ipfsServer: IPFS;
    let botDXN: string;

    before(async () => {
      brokerSetup = await setupBroker();
      const ipfsSetup = await setupIPFSWithBot('./bots/start-echo-bot.ts');
      registry = ipfsSetup.registry;
      ipfsServer = ipfsSetup.ipfsServer;
      botDXN = ipfsSetup.botDXN;
    });

    after(async () => {
      await brokerSetup.broker.stop();
      await ipfsServer.stop();
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

      const contentLoader = new DXNSContentLoader(registry, ipfsServer.endpoint);
  
      const botFactory = new BotFactory(contentLoader, botContainer, config);
    
      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);

      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);

      const botHandle = await botFactoryClient.spawn(
        {
          dxn: botDXN
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
