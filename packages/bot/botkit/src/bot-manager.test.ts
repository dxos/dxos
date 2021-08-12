import { Client } from "@dxos/client";
import { Config } from "@dxos/config";
import { createId, keyToBuffer, PublicKey, randomBytes, sign } from "@dxos/crypto";
import { BotManager } from "./bot-manager";
import { getClientConfig } from "./config";
import { LocalDevBotContainer } from "./containers";
import { NATIVE_ENV, NODE_ENV } from "./env";
import { it as test } from 'mocha'
import expect from 'expect'
import { waitForCondition } from "@dxos/async";
import { TEST_SIGNAL_URL } from "./test-setup";

describe('BotManager', () => {
  test('start a bot locally', async () => {
    
    const config = new Config({
      bot: {
        topic: PublicKey.random().toHex(),
        localDev: true,
        dumpFile: `/out/${createId()}/bots.json`,
      },
      services: {
        signal: {
          server: TEST_SIGNAL_URL
        },
        ice: undefined,
        wns: {
          server: 'https://node1.dxos.network/wns/api', // Who knows if this is a valid URL but it's not used so whatever.
          chainId: 'wireline'
        }
      },
    })

    const client = new Client({
      swarm: getClientConfig(config).swarm
    });
    await client.initialize();

    const botContainer = new LocalDevBotContainer(config.get('cli.nodePath'));

    const botManager = new BotManager(
      config,
      {
        [NODE_ENV]: botContainer,
        [NATIVE_ENV]: botContainer,
      },
      client,
      {
        signChallenge: challenge => sign(challenge, keyToBuffer(config.get('bot.secretKey'))),
        emitBotEvent: async () => {}
      }
    );

    expect(botManager.controlTopic).toBeDefined()

    await botContainer.start({ controlTopic: botManager.controlTopic, botConfig: config });
    await botManager.start();

    const bot = await botManager.spawnBot('testbot', {
      botPath: require.resolve('@dxos/bot/src/default-bot.ts'),
      env: NODE_ENV
    });

    await waitForCondition(() => botManager.botReady(bot), 10_000);

    await botManager.stopBot(bot)

    await botManager.stop();
  }).timeout(15_000);
})
