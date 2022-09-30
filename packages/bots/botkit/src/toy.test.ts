//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { BotFactoryClient } from '@dxos/bot-factory-client';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { Bot, GetLogsResponse } from '@dxos/protocols/proto/dxos/bot';
import { RegistryClient } from '@dxos/registry-client';

import { InProcessBotContainer, NodeContainer } from './bot-container';
import { BotController, BotFactory, DXNSContentResolver } from './bot-factory';
import { EchoBot, EmptyBot, TEST_ECHO_TYPE } from './bots';
import { Bot as ClientBot } from './bots/client-bot';
import { BrokerSetup, ClientSetup, setupBroker, setupClient, setupMockRegistryWithBot } from './testutils';

const signalContext = new MemorySignalManagerContext();

describe('In-Memory', () => {
  describe('No client', () => {
    it('Spawns a bot', async () => {
      let botInitialized = false;
      class TestBot extends EmptyBot {
        override async onInit () {
          botInitialized = true;
        }
      }

      const nm1 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
      const nm2 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
      const topic = PublicKey.random();

      const botContainer = new InProcessBotContainer(() => new TestBot());
      const botFactory = new BotFactory({ config: new Config({}), botContainer });
      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);
      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);

      const { id: botId } = await botFactoryClient.botFactory.spawnBot({});
      expect(botId).toBeDefined();

      const { bots } = await botFactoryClient.botFactory.getBots();
      expect(bots).toHaveLength(1);
      expect(bots![0].status).toBe(Bot.Status.RUNNING);
      expect(botInitialized).toBe(true);
      const lastStart = bots![0].lastStart;
      expect(lastStart instanceof Date && !isNaN(lastStart.getTime())).toBe(true);

      const command = PublicKey.random().asUint8Array();
      const response = await botFactoryClient.botFactory.sendCommand({ botId, command });

      expect(response.response).toBeDefined();
      expect(Buffer.from(command).equals(Buffer.from(response.response!))).toBe(true);

      await botFactoryClient.botFactory.removeAll();
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
      const { party } = clientSetup;

      const nm1 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
      const nm2 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
      const topic = PublicKey.random();

      const botContainer = new InProcessBotContainer(() => new EchoBot(TEST_ECHO_TYPE));
      const botFactory = new BotFactory({
        botContainer,
        config: new Config({})
      });

      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);
      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);
      const botHandle = await botFactoryClient.spawn({}, party);
      const command = PublicKey.random().asUint8Array();
      await botHandle.sendCommand(command);

      await party.database.waitForItem({
        type: TEST_ECHO_TYPE
      });

      const item = await party.database.waitForItem<ObjectModel>({ type: TEST_ECHO_TYPE });
      const payload = item.model.get('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

      await botFactoryClient.botFactory.removeAll();
      await botFactoryClient.stop();
    });

    it('sees bot updates', async () => {
      const { party } = clientSetup;

      const botContainer = new InProcessBotContainer(() => new ClientBot());
      const botFactory = new BotFactory({
        botContainer,
        config: new Config({})
      });
      await botFactory.spawnBot({
        partyKey: party.key,
        invitation: (await party.createInvitation({})).descriptor.toProto()
      });
      await waitForExpect(async () => {
        const { bots } = await botFactory.getBots();
        // console.log(bots);
        expect(bots).toHaveLength(1);
        const frames = bots[0].report?.partyDetails?.processedTimeframe?.frames();
        assert(frames);
        expect(frames.length).toBeGreaterThan(0);
        expect(frames[0][1]).toBeGreaterThan(0);
      });
    });
  });
});

describe('Node', () => {
  describe('With a DXOS client', () => {
    let clientSetup: ClientSetup;
    let brokerSetup: BrokerSetup;
    let registry: RegistryClient;
    let botDXN: string;

    before(async () => {
      brokerSetup = await setupBroker();
      const ipfsSetup = await setupMockRegistryWithBot(require.resolve('./bots/start-echo-bot'));
      registry = ipfsSetup.registry;
      botDXN = ipfsSetup.botDXN;
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

    it('Spawns and restarts echo-bot', async () => {
      const { party } = clientSetup;
      const { config } = brokerSetup;

      const nm1 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
      const nm2 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
      const topic = PublicKey.random();

      const botContainer = new NodeContainer(['@swc-node/register']);

      const contentResolver = new DXNSContentResolver(registry);

      const botFactory = new BotFactory({
        botContainer,
        config,
        contentResolver
      });

      const botController = new BotController(botFactory, nm1);
      await botController.start(topic);

      const botFactoryClient = new BotFactoryClient(nm2);
      await botFactoryClient.start(topic);

      const botHandle = await botFactoryClient.spawn(
        {
          name: botDXN
        },
        party
      );

      const testCommand = async () => {
        const command = PublicKey.random().asUint8Array();

        let unsub: (() => void) | undefined;
        const waitForNewItem = new Promise<boolean>(resolve => {
          const result = party.database
            .select({ type: TEST_ECHO_TYPE })
            .exec();

          result
            .update.on(async result => {
              for (const item of result.entities) {
                const payload = item.model.get('payload');
                if (PublicKey.from(payload).toString() === PublicKey.from(command).toString()) {
                  resolve(true);
                }
              }
            });
        });

        await botHandle.sendCommand(command);
        const timeout = async () => {
          await sleep(5000);
          return false;
        };

        const found = await Promise.race([waitForNewItem, timeout()]);
        expect(found).toBe(true);
        unsub?.();
      };

      const logsStream = botHandle.logsStream();

      await testCommand();
      await new Promise<void>(resolve => {
        logsStream.subscribe((msg: GetLogsResponse) => {
          if (msg.chunk?.toString().includes('onCommand')) {
            resolve();
          }
        }, () => {});
      });

      await botHandle.stop();
      {
        const { bots } = await botFactoryClient.botFactory.getBots();
        expect(bots).toHaveLength(1);
        expect(bots![0].status).toBe(Bot.Status.STOPPED);
      }
      await botHandle.start();

      await testCommand();

      {
        const { bots } = await botFactoryClient.botFactory.getBots();
        expect(bots).toHaveLength(1);
        expect(bots![0].status).toBe(Bot.Status.RUNNING);
        const lastStart = bots![0].lastStart;
        expect(lastStart instanceof Date && !isNaN(lastStart.getTime())).toBe(true);

        await botFactoryClient.botFactory.removeAll();
        await botFactoryClient.stop();
      }
    });
  });
});
