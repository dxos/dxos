//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Client } from '@dxos/client';
import { SecretProvider } from '@dxos/credentials';
import { Party } from '@dxos/echo-db';

import { BotService, InitializeRequest, SendCommandRequest, SendCommandResponse } from '../proto/gen/dxos/bot';
import { decodeInvitation } from '../utils';

const log = debug('dxos:bot:client-bot');

export class ClientBot implements BotService {
  protected client: Client | undefined;
  protected party: Party | undefined;

  async Initialize (request: InitializeRequest) {
    log('Client bot start initilizing');
    this.client = new Client(request.config);

    log('Client bot initialize');
    await this.client.initialize();
    log('Client bot create profile');
    await this.client.halo.createProfile({ username: 'Bot' });

    if (request.invitation?.invitationCode) {
      const secret = request.invitation.secret;
      assert(secret, 'Secret must be provided with invitation');
      const invitation = decodeInvitation(request.invitation.invitationCode);
      const botSecretProvider: SecretProvider = async () => Buffer.from(secret);
      log('Client bot join party');
      // TODO(yivlad): errors are nto handled well in RPC.
      try {
        this.party = await this.client.echo.joinParty(invitation, botSecretProvider);
      } catch (e: unknown) {
        throw new Error(`Failed to join party: ${e}`);
      }
    }
    log('Client bot onInit');
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
