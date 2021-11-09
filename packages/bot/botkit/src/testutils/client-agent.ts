//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { RpcPort } from '@dxos/rpc';

import { BotFactoryAgent } from './agent';
import { encodeInvitation } from './intivitations';

export class ClientAgent extends BotFactoryAgent {
  private readonly _client: Client;
  private _party: Party | undefined;

  constructor (port: RpcPort) {
    super(port);
    this._client = new Client();
  }

  override async start () {
    await super.start();
    await this._client.initialize();
    await this._client.echo.halo.createIdentity({ ...createKeyPair() });
    await this._client.echo.halo.create('Agent');
    const party = await this._client.echo.createParty();
    this._party = party;
  }

  async createBot () {
    if (!this._party) {
      throw new Error('Client is not started');
    }

    const invitation = await this._party.createInvitation();
    const bot = await this.botFactory.SpawnBot({
      invitation: {
        data: encodeInvitation(invitation)
      }
    });

    return bot;
  }

  get client () {
    return this._client;
  }

  get party () {
    return this._party;
  }
}
