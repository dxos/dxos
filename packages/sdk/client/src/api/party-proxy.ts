//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import {
  ActivationOptions, Database, InvitationDescriptor, PARTY_ITEM_TYPE, PARTY_TITLE_PROPERTY, RemoteDatabaseBackend
} from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { ClientServiceProvider } from '../interfaces';
import { InvitationState, Party } from '../proto/gen/dxos/client';
import { ClientServiceProxy } from '../service-proxy';
import { decodeInvitation, streamToResultSet } from '../util';
import { InvitationRequest } from './invitations';

export class PartyProxy {
  private readonly _database?: Database;

  private _key: PartyKey;
  private _isOpen: boolean;
  private _isActive: boolean;

  readonly activeInvitations: InvitationRequest[] = [];
  readonly invitationsUpdate = new Event();

  constructor (
    private _serviceProvider: ClientServiceProvider,
    private _modelFactory: ModelFactory,
    _party: Party
  ) {
    this._key = _party.publicKey;
    this._isOpen = _party.isOpen;
    this._isActive = _party.isActive;

    if (!_party.isOpen) {
      return;
    }

    if (_serviceProvider instanceof ClientServiceProxy) {
      this._database = new Database(
        this._modelFactory,
        new RemoteDatabaseBackend(this._serviceProvider.services.DataService, this._key)
      );
    } else {
      const party = this._serviceProvider.echo.getParty(this._key) ?? failUndefined();
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

  processPartyUpdate (party: Party) {
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
   * If the invitee is known ahead of time, `createOfflineInvitation` can be used instead.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.acceptInvitation` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   */
  async createInvitation (): Promise<InvitationRequest> {
    const stream = this._serviceProvider.services.PartyService.CreateInvitation({ partyKey: this.key });
    return new Promise((resolve, reject) => {
      const connected = new Event();
      const finished = new Event();
      const error = new Event<Error>();
      let invitation: InvitationRequest;

      connected.on(() => this.invitationsUpdate.emit());

      stream.subscribe(invitationMsg => {
        if (!invitation) {
          assert(invitationMsg.descriptor, 'Missing invitation descriptor.');
          const descriptor = InvitationDescriptor.fromProto(invitationMsg.descriptor);
          invitation = new InvitationRequest(descriptor, connected, finished, error);
          this.activeInvitations.push(invitation);
          this.invitationsUpdate.emit();
          resolve(invitation);
        }

        if (invitationMsg.state === InvitationState.CONNECTED && !invitation.hasConnected) {
          connected.emit();
        }

        if (invitationMsg.state === InvitationState.SUCCESS) {
          finished.emit();
          this.removeInvitation(invitation);
          stream.close();
        }

        if (invitationMsg.state === InvitationState.ERROR) {
          assert(invitationMsg.error, 'Unknown error.');
          const err = new Error(invitationMsg.error);
          reject(err);
          error.emit(err);
        }
      }, error => {
        if (error) {
          console.error(error);
          reject(error);
          // TODO(rzadp): Handle retry.
        }
      });
    });
  }

  removeInvitation (invitation: InvitationRequest) {
    const index = this.activeInvitations.findIndex(activeInvitation =>
      // TODO(wittjosiah): Better comparison.
      activeInvitation.toString() === invitation.toString()
    );
    this.activeInvitations.splice(index, 1);
    this.invitationsUpdate.emit();
  }

  queryMembers () {
    return streamToResultSet(
      this._serviceProvider.services.PartyService.SubscribeParties(),
      (response) => response?.parties?.find(party => party.publicKey.equals(this.key))?.members ?? []
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
}
