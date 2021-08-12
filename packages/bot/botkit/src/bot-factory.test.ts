//
// Copyright 2021 DXOS.org
//

import { describe, it as test } from 'mocha';
import { tmpdir } from 'os'

import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';

import { BotFactory } from './bot-factory';
import { NODE_ENV } from './env';

describe('BotFactory', () => {
  test('start & stop', async () => {
    const botFactory = new BotFactory(new Config({
      bot: {
        topic: PublicKey.random().toHex(),
        localDev: false,
        dumpFile: tmpdir() + '/bots.json',
      },
      services: {
        signal: {
          server: undefined
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
        dumpFile: tmpdir() + '/bots.json',
      },
      services: {
        signal: {
          server: undefined
        },
        ice: undefined,
        wns: {
          server: 'https://node1.dxos.network/wns/api', // Who knows if this is a valid URL but it's not used so whatever.
          chainId: 'wireline'
        }
      },
    }), {});

    await botFactory.start();

    const bot = await botFactory.spawnBot('testbot', {
      botPath: require.resolve('@dxos/bot/src/default-bot.ts'),
      env: NODE_ENV
    });

    await botFactory.stop();
  });
});
