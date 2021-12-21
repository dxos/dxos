//
// Copyright 2021 DXOS.org
//

import { failUndefined } from '@dxos/debug';
import { ActivationOptions, Database, PARTY_ITEM_TYPE, PARTY_TITLE_PROPERTY, RemoteDatabaseBackend } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { ClientServiceProvider } from '../interfaces';
import { Party } from '../proto/gen/dxos/client';
import { ClientServiceProxy } from '../service-proxy';
import { streamToResultSet } from '../util';

export class PartyProxy {
  private readonly _database?: Database;

  readonly key: PartyKey;
  readonly isOpen: boolean;
  readonly isActive: boolean;

  constructor (
    private _serviceProvider: ClientServiceProvider,
    private _modelFactory: ModelFactory,
    _party: Party
  ) {
    this.key = _party.publicKey;
    this.isOpen = _party.isOpen;
    this.isActive = _party.isActive;

    if (!_party.isOpen) {
      return;
    }

    if (_serviceProvider instanceof ClientServiceProxy) {
      this._database = new Database(
        this._modelFactory,
        new RemoteDatabaseBackend(this._serviceProvider.services.DataService, this.key)
      );
    } else {
      const party = this._serviceProvider.echo.getParty(this.key) ?? failUndefined();
      this._database = party.database;
    }
  }

  async init () {
    if (this._database && this._serviceProvider instanceof ClientServiceProxy) {
      await this._database.init();
    }
  }

  async destroy () {
    if (this._database && this._serviceProvider instanceof ClientServiceProxy) {
      await this._database.destroy();
    }
  }

  /**
   * Database instance of the current party.
   */
  get database () {
    if (!this._database) {
      throw Error('Party not open');
    }

    return this._database;
  }

  async open () {
    await this._serviceProvider.services.PartyService.OpenParty({ partyKey: this.key });
  }

  async close () {
    await this._serviceProvider.services.PartyService.CloseParty({ partyKey: this.key });
  }

  async activate (options: ActivationOptions) {
    await this._serviceProvider.services.PartyService.ActivateParty({ partyKey: this.key, options });
  }

  async deactivate (options: ActivationOptions) {
    await this._serviceProvider.services.PartyService.DeactivateParty({ partyKey: this.key, options });
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
    return streamToResultSet(
      this._serviceProvider.services.PartyService.SubscribeMembers({ partyKey: this.key }),
      (response) => response?.members ?? []
    );
  }

  setTitle (title: string) {
    return this.setProperty(PARTY_TITLE_PROPERTY, title);
  }

  async setProperty (key: string, value?: string) {
    await this.database.waitForItem({ type: PARTY_ITEM_TYPE });
    const item = this.getPropertiesItem();
    await item.model.setProperty(key, value);
    return this;
  }

  getProperty (key: string) {
    const item = this.getPropertiesItem();
    return item?.model.getProperty(key);
  }

  private getPropertiesItem () {
    const items = this.database.select(s => s.filter({ type: PARTY_ITEM_TYPE }).items).getValue();
    return items[0];
  }
}
