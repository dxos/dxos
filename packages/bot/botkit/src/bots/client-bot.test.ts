//
// Copyright 2021 DXOS.org
//

import { setupBroker, setupClient } from '../testutils';
import { ClientBot } from './client-bot';

describe('Client Bot', () => {
  it('Starts a bot', async () => {
    const { client, invitation, secret } = await setupClient();
    const bot = new ClientBot();

    await bot.Initialize({
      invitation: {
        data: invitation
      },
      secret
    });

    await bot.Stop();
    await client.destroy();
  });

  it('Starts a bot with a remote signal server', async () => {
    const { broker, config } = await setupBroker();
    const { client, invitation, secret } = await setupClient(config);
    const bot = new ClientBot();

    await bot.Initialize({
      config: JSON.stringify(config),
      invitation: {
        data: invitation
      },
      secret
    });

    await broker.stop();
    await bot.Stop();
    await client.destroy();
  });
});
