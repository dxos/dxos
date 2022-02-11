//
// Copyright 2021 DXOS.org
//

import { describe, it as test } from 'mocha';

import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';

import { BotFactory } from './bot-factory';

describe('BotFactory', () => {
  test.skip('start & stop', async () => {
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
        dxns: {
          server: 'wss://enterprise.kube.dxos.network/dxns/ws'
        }
      }
    } as any), {});

    await botFactory.start();

    await botFactory.stop();
  });
});
