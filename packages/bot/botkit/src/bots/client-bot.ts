//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Client } from '@dxos/client';
import { SecretProvider } from '@dxos/credentials';
import { Party } from '@dxos/echo-db';

import { createIpcPort } from '../bot-container';
import { BotService, InitializeRequest, SendCommandRequest, SendCommandResponse } from '../proto/gen/dxos/bot';
import { decodeInvitation } from '../utils/intivitations';
import { startBot } from './start-bot';

export class ClientBot implements BotService {
  protected client: Client | undefined;
  protected party: Party | undefined;

  async Initialize (request: InitializeRequest) {
    this.client = new Client(request.config);

    await this.client.initialize();
    await this.client.echo.halo.createProfile({ username: 'Bot' });

    if (request.invitation?.invitationCode) {
      const secret = request.invitation.secret;
      assert(secret, 'Secret must be provided with invitation');
      const invitation = decodeInvitation(request.invitation.invitationCode);
      const botSecretProvider: SecretProvider = async () => Buffer.from(secret);
      console.log('Before join');
      this.party = await this.client.echo.joinParty(invitation, botSecretProvider);
      console.log('After join');
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
