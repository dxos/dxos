//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { setupBroker, setupClient } from '../testutils';
import { Bot } from './client-bot';

describe('Client Bot', function () {
  it('Starts a bot', async function () {
    const { client, invitation } = await setupClient();
    const bot = new Bot();

    await bot.initialize({
      id: PublicKey.random().toHex(),
      config: {},
      invitation
    });

    await bot.stop();
    await client.destroy();
  });

  it('Starts a bot with a remote signal server', async function () {
    const { broker, config } = await setupBroker();
    const { client, invitation } = await setupClient(config);
    const bot = new Bot();

    await bot.initialize({
      id: PublicKey.random().toHex(),
      config: config.values,
      invitation
    });

    await broker.stop();
    await bot.stop();
    await client.destroy();
  });
});
