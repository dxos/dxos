//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import {
  ActivationOptions, Database, PARTY_ITEM_TYPE, PARTY_TITLE_PROPERTY, RemoteDatabaseBackend
} from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { ClientServiceHost } from '../client/service-host';
import { ClientServiceProxy } from '../client/service-proxy';
import { ClientServiceProvider } from '../interfaces';
import { Party } from '../proto/gen/dxos/client';
import { streamToResultSet } from '../util';
import { InvitationRequest, InvitationProxy } from './invitations';

export interface CreationInvitationOptions {
  inviteeKey?: PublicKey
}

export class PartyProxy extends InvitationProxy {
  private readonly _database?: Database;

  private _key: PartyKey;
  private _isOpen: boolean;
  private _isActive: boolean;

  constructor (
    private _serviceProvider: ClientServiceProvider,
    private _modelFactory: ModelFactory,
    _party: Party
  ) {
    super();
    this._key = _party.publicKey;
    this._isOpen = _party.isOpen;
    this._isActive = _party.isActive;

    if (!_party.isOpen) {
      return;
    }

    if (this._serviceProvider instanceof ClientServiceProxy) {
      this._database = new Database(
        this._modelFactory,
        new RemoteDatabaseBackend(this._serviceProvider.services.DataService, this._key)
      );
    } else if (this._serviceProvider instanceof ClientServiceHost) {
      const party = this._serviceProvider.echo.getParty(this._key) ?? failUndefined();
      this._database = party.database;
    } else {
      throw new Error('Unrecognized service provider.');
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
   * Called by EchoProxy to update this party instance.
   * @internal
   */
  _processPartyUpdate (party: Party) {
    this._key = party.publicKey;
    this._isOpen = party.isOpen;
    this._isActive = party.isActive;
  }

  get key () {
    return this._key;
  }

  get isOpen () {
    return this._isOpen;
  }

  get isActive () {
    return this._isActive;
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
    return this.setOpen(true);
  }

  async setOpen (open: boolean) {
    await this._serviceProvider.services.PartyService.SetPartyState({
      partyKey: this.key,
      open
    });
  }

  async setActive (active: boolean, options: ActivationOptions) {
    const activeGlobal = options.global ? active : undefined;
    const activeDevice = options.device ? active : undefined;
    await this._serviceProvider.services.PartyService.SetPartyState({
      partyKey: this.key,
      activeGlobal,
      activeDevice
    });
  }

  /**
   * Creates an invitation to a given party.
   * The Invitation flow requires the inviter and invitee to be online at the same time.
   * If the invitee is known ahead of time, `inviteeKey` can be provide to not require the secret exchange.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.acceptInvitation` on the invitee side.
   *
   * @param inviteeKey Public key of the invitee. In this case no secret exchange is required, but only the specified recipient can accept the invitation.
   */
  async createInvitation ({ inviteeKey }: CreationInvitationOptions = {}): Promise<InvitationRequest> {
    const stream = this._serviceProvider.services.PartyService.CreateInvitation({ partyKey: this.key, inviteeKey });
    return this.createInvitationRequest({ stream });
  }

  queryMembers () {
    return streamToResultSet(
      this._serviceProvider.services.PartyService.SubscribeMembers({ partyKey: this.key }),
      (response) => response?.members ?? []
    );
  }

  setTitle (title: string) {
    return this.setProperty(PARTY_TITLE_PROPERTY, title);
  }

  async setProperty (key: string, value?: any) {
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

  createSnapshot () {
    return this._serviceProvider.services.PartyService.CreateSnapshot({ partyKey: this.key });
  }
}
