//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { Database, Party as EchoParty, RemoteDatabaseBackend } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { ClientServiceProvider } from '../interfaces';
import { ClientServiceProxy } from '../service-proxy';

export class PartyProxy {
  private readonly _database: Database;

  constructor (
    private _serviceProvider: ClientServiceProvider,
    private _modelFactory: ModelFactory,
    private _partyKey: PublicKey
  ) {
    if (_serviceProvider instanceof ClientServiceProxy) {
      this._database = new Database(
        this._modelFactory,
        new RemoteDatabaseBackend(this._serviceProvider.services.DataService, this._partyKey)
      );
    } else {
      const party = this._serviceProvider.echo.getParty(this._partyKey) ?? failUndefined();
      this._database = party.database;
    }
  }

  /**
   * Returns the ECHO version of the party if we are running in local mode.
   *
   * @deprecated
   */
  get impl (): EchoParty {
    return this._serviceProvider.echo.getParty(this._partyKey) ?? failUndefined();
  }

  async open () {
    if (this._serviceProvider instanceof ClientServiceProxy) {
      await this._database.init();
    }
  }

  async close () {
    if (this._serviceProvider instanceof ClientServiceProxy) {
      await this._database.destroy();
    }
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

  // Use client methods instead!

  // async createInvitation (...args: Parameters<EchoParty['createInvitation']>) {
  //   const party = this._serviceProvider.echo.getParty(this._partyKey);
  //   assert(party, 'Party not found');
  //   return party!.createInvitation(...args);
  // }

  // async createOfflineInvitation (...args: Parameters<EchoParty['createOfflineInvitation']>) {
  //   const party = this._serviceProvider.echo.getParty(this._partyKey);
  //   assert(party, 'Party not found');
  //   return party!.createOfflineInvitation(...args);
  // }

  queryMembers () {
    return this._serviceProvider.services.PartyService.SubscribeMembers({ partyKey: this.key });
  }

  setTitle (title: string) {
    return this._serviceProvider.services.PartyService.SetPartyTitle({ partyKey: this.key, title });
  }

  setProperty (key: string, value?: string) {
    return this._serviceProvider.services.PartyService.SetPartyProperty({ partyKey: this.key, key, value });
  }

  getProperty (key: string) {
    return this._serviceProvider.services.PartyService.GetPartyProperty({ partyKey: this.key, key });
  }
}
