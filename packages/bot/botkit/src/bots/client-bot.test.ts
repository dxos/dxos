//
// Copyright 2021 DXOS.org
//

import { setupBroker, setupClient } from '../testutils';
import { ClientBot } from './client-bot';

describe('Client Bot', () => {
  it('Starts a bot', async () => {
    const { client, invitation } = await setupClient();
    const bot = new ClientBot();

    await bot.initialize({
      invitation
    });

    await bot.stop();
    await client.destroy();
  });

  it('Starts a bot with a remote signal server', async () => {
    const { broker, config } = await setupBroker();
    const { client, invitation } = await setupClient(config);
    const bot = new ClientBot();

    await bot.initialize({
      config: config.values,
      invitation
    });

    await broker.stop();
    await bot.stop();
    await client.destroy();
  });
});
