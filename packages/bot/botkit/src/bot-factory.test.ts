//
// Copyright 2021 DXOS.org
//

import { describe, it as test } from 'mocha';

import { Config } from '@dxos/config';
import { createId, PublicKey } from '@dxos/crypto';

import { BotFactory } from './bot-factory';
import { NODE_ENV } from './env';
import { TEST_SIGNAL_URL } from './test-setup';

describe('BotFactory', () => {
  test('start & stop', async () => {
    const botFactory = new BotFactory(new Config({
      bot: {
        topic: PublicKey.random().toHex(),
        localDev: false,
        dumpFile: `/out/${createId()}/bots.json`
      },
      services: {
        signal: {
          server: TEST_SIGNAL_URL
        },
        ice: undefined,
        wns: {
          server: 'https://node1.dxos.network/wns/api',
          chainId: 'wireline'
        }
      }
    }), {});

    await botFactory.start();

    await botFactory.stop();
  });

  test('start a bot locally', async () => {
    const botFactory = new BotFactory(new Config({
      bot: {
        topic: PublicKey.random().toHex(),
        localDev: true,
        dumpFile: `/out/${createId()}/bots.json`
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
      }
    }), {});

    await botFactory.start();

    await botFactory.spawnBot('testbot', {
      botPath: require.resolve('@dxos/bot/src/default-bot.ts'),
      env: NODE_ENV
    });

    await botFactory.stop();
  });
});
