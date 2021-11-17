//
// Copyright 2021 DXOS.org
//

import { Client } from "@dxos/client";
import { SecretProvider } from "@dxos/credentials";
import { setupBroker, setupClient } from "../testutils";
import { decodeInvitation } from "../utils";

describe('Fake', () => {
  it('Fake', async () => {
    const { broker, config } = await setupBroker();
    const { client, invitation, secret } = await setupClient(config);

    const botClient = new Client(config);
    await botClient.initialize();
    await botClient.echo.open();
    await botClient.echo.halo.createProfile({ username: 'Bot' });

    const decodedInvitation = decodeInvitation(invitation);
    const botSecretProvider: SecretProvider = async () => Buffer.from(secret!);
    await botClient.echo.joinParty(decodedInvitation, botSecretProvider);

    await broker.stop();
    await client.destroy();
    await botClient.destroy();
  });
});