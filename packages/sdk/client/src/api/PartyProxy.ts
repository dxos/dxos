//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Database, Party as EchoParty, RemoteDatabaseBackend } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { ClientServiceProvider } from '../interfaces';
import { Party } from '../proto/gen/dxos/client';

export class PartyProxy {
  private readonly _database: Database;

  constructor (
    private _serviceProvider: ClientServiceProvider,
    private _modelFactory: ModelFactory,
    private _partyKey: Party['publicKey']
  ) {
    this._database = new Database(
      this._modelFactory,
      new RemoteDatabaseBackend(this._serviceProvider.services.DataService, this._partyKey)
    );
  }

  async open () {
    await this._database.init();
  }

  /**
   * Party key. Each party is identified by its key.
   */
  get key (): PartyKey {
    return this._partyKey;
  }

  /**
   * Database instance of the current party.
   */
  get database () {
    return this._database;
  }

  async createInvitation (...args: Parameters<EchoParty['createInvitation']>) {
    const party = this._serviceProvider.echo.getParty(this._partyKey);
    assert(party, 'Party not found');
    return party!.createInvitation(...args);
  }

  async createOfflineInvitation (...args: Parameters<EchoParty['createOfflineInvitation']>) {
    const party = this._serviceProvider.echo.getParty(this._partyKey);
    assert(party, 'Party not found');
    return party!.createOfflineInvitation(...args);
  }

  queryMembers (...args: Parameters<EchoParty['queryMembers']>) {
    const party = this._serviceProvider.echo.getParty(this._partyKey);
    assert(party, 'Party not found');
    return party!.queryMembers(...args);
  }
}
