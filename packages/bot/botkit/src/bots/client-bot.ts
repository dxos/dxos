//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { SecretProvider } from '@dxos/credentials';
import { createKeyPair, PublicKey } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';

import { createIpcPort } from '../bot-container';
import { BotService, InitializeRequest, SendCommandRequest, SendCommandResponse } from '../proto/gen/dxos/bot';
import { decodeInvitation } from '../utils/intivitations';
import { startBot } from './start-bot';

export class ClientBot implements BotService {
  protected client: Client | undefined;
  protected party: Party | undefined;

  async Initialize (request: InitializeRequest) {
    if (request.config) {
      this.client = new Client(JSON.parse(request.config));
    } else {
      this.client = new Client();
    }
    await this.client.initialize();
    await this.client.echo.halo.createProfile({ username: 'Bot' });

    if (request.invitation?.data) {
      const secret = request.secret
      assert(secret, 'Secret must be provided with invitation');
      const invitation = decodeInvitation(request.invitation.data);
      const botSecretProvider: SecretProvider = async () => Buffer.from(secret);
      this.party = await this.client.echo.joinParty(invitation, botSecretProvider);
    }
    await this.onInit(request);
  }

  async Command (request: SendCommandRequest) {
    const response = await this.onCommand(request);
    return response;
  }

  async Stop () {
    await this.client?.destroy();
    await this.onStop();
  }

  protected async onInit (request: InitializeRequest) {}
  protected async onCommand (request: SendCommandRequest): Promise<SendCommandResponse> {
    return {};
  }

  protected async onStop () {}
}

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  void startBot(new ClientBot(), port);
}
