//
// Copyright 2021 DXOS.org
//

import { setupBroker, setupClient } from "../testutils";
import { EchoBot, TEST_ECHO_TYPE } from "./echo-bot";

describe('Echo Bot', () => {
  it('Starts a bot', async () => {
    const { client, invitation, secret } = await setupClient();
    const bot = new EchoBot(TEST_ECHO_TYPE);

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
    const bot = new EchoBot(TEST_ECHO_TYPE);

    await bot.Initialize({
      config: JSON.stringify(config),
      invitation: {
        data: invitation
      },
      secret
    });

    await bot.Stop();
    await client.destroy();
    await broker.stop();
  });
});
