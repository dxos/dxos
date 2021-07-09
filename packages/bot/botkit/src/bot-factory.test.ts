//
// Copyright 2021 DXOS.org
//

import { describe, it as test } from 'mocha';

import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';

import { BotFactory } from './bot-factory';

describe('BotFactory', () => {
  test('start & stop', async () => {
    const botFactory = new BotFactory(new Config({
      bot: {
        topic: PublicKey.random().toHex(),
        localDev: false
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
});
