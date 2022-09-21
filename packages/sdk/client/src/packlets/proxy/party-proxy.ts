//
// Copyright 2021 DXOS.org
//

import { failUndefined, todo } from '@dxos/debug';
import {
  Database,
  Item,
  RemoteDatabaseBackend,
  streamToResultSet
} from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ObjectProperties } from '@dxos/object-model';
import { Party as PartyProto, PartyDetails } from '@dxos/protocols/proto/dxos/client';
import { PartySnapshot } from 'packages/common/protocols/proto/dxos/echo/snapshot';

import { ClientServiceProvider, CreationInvitationOptions, InvitationRequest, Party } from '../api';
import { InvitationProxy } from './invitation-proxy';
import { ClientServiceProxy } from './service-proxy';

export interface ActivationOptions {}

/**
 * Main public Party API.
 * Proxies requests to local/remove services.
 */
export class PartyProxy implements Party {
  private readonly _database?: Database;
  private readonly _invitationProxy = new InvitationProxy();

  private _key: PublicKey;
  private _isOpen: boolean;
  private _isActive: boolean;
  private _item?: Item<ObjectModel>;

  /**
   * @internal
   */
  constructor (
    private _serviceProvider: ClientServiceProvider,
    private _modelFactory: ModelFactory,
    party: PartyProto,
    memberKey: PublicKey
  ) {
    this._key = party.publicKey;
    this._isOpen = party.isOpen;
    this._isActive = party.isActive;
    if (!party.isOpen) {
      return;
    }

    if (true) { // TODO: Always run database in remote mode for now.
      this._database = new Database(
        this._modelFactory,
        new RemoteDatabaseBackend(this._serviceProvider.services.DataService, this._key),
        memberKey
      );
    } else if (false) {
      // TODO(wittjosiah): Reconcile service provider host with interface.
      const party = (this._serviceProvider as any).echo.getParty(this._key) ?? failUndefined();
      this._database = party.database;
    } else {
      throw new Error('Unrecognized service provider.');
    }
  }

  // TODO(burdon): Getter required by react hook.
  get invitationProxy () {
    return this._invitationProxy;
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

  // TODO(burdon): Invert party/database? (e.g., const db = client.connect()).
  get database (): Database {
    if (!this._database) {
      throw new Error('Party not open.');
    }

    return this._database;
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   */
  get select (): Database['select'] {
    return this.database.select.bind(this.database);
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   */
  get reduce (): Database['reduce'] {
    return this.database.reduce.bind(this.database);
  }

  /**
   * Called by EchoProxy open.
   */
  async initialize () {
    // if (this._database && this._serviceProvider instanceof ClientServiceProxy) {
      await this._database!.initialize();
    // }

    // Root item for properties.
    // this._item = await this._database?.waitForItem({ type: PARTY_ITEM_TYPE });
  }

  /**
   * Called by EchoProxy close.
   */
  async destroy () {
    if (this._database && this._serviceProvider instanceof ClientServiceProxy) {
      await this._database.destroy();
    }
  }

  async open () {
    await this._setOpen(true);
  }

  async close () {
    await this._setOpen(false);
  }

  async getDetails (): Promise<PartyDetails> {
    return this._serviceProvider.services.PartyService.getPartyDetails({ partyKey: this._key });
  }

  async _setOpen (open: boolean) {
    await this._serviceProvider.services.PartyService.setPartyState({
      partyKey: this.key,
      open
    });
  }

  // TODO(burdon): Requires comment.
  async setActive (active: boolean, options: ActivationOptions) {
    // const activeGlobal = options.global ? active : undefined;
    // const activeDevice = options.device ? active : undefined;
    // await this._serviceProvider.services.PartyService.setPartyState({
    //   partyKey: this.key,
    //   activeGlobal,
    //   activeDevice
    // });
  }

  get properties (): ObjectProperties {
    return this._item!.model;
  }

  /**
   * @deprecated Use party.properties.
   */
  async setTitle (title: string) {
    // await this.setProperty(PARTY_TITLE_PROPERTY, title);
  }

  /**
   * @deprecated Use party.properties.
   */
  getTitle () {
    return todo()
    // return this.getProperty(PARTY_TITLE_PROPERTY);
  }

  /**
   * @deprecated Use party.properties.
   */
  async setProperty (key: string, value?: any) {
    await this.properties.set(key, value);
  }

  /**
   * @deprecated Use party.properties.
   */
  getProperty (key: string, defaultValue?: any) {
    return this.properties.get(key, defaultValue);
  }

  /**
   * Return set of party members.
   */
  // TODO(burdon): Don't expose result object and provide type.
  queryMembers () {
    return streamToResultSet(
      this._serviceProvider.services.PartyService.subscribeMembers({ partyKey: this.key }),
      (response) => response?.members ?? []
    );
  }

  /**
   * Creates an invitation to a given party.
   * The Invitation flow requires the inviter and invitee to be online at the same time.
   * If the invitee is known ahead of time, `inviteeKey` can be provide to not require the secret exchange.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.acceptInvitation` on the invitee side.
   *
   * @param inviteeKey Public key of the invitee. In this case no secret exchange is required,
   *   but only the specified recipient can accept the invitation.
   */
  async createInvitation ({ inviteeKey }: CreationInvitationOptions = {}): Promise<InvitationRequest> {
    const stream = this._serviceProvider.services.PartyService.createInvitation({ partyKey: this.key, inviteeKey });
    return this._invitationProxy.createInvitationRequest({ stream });
  }

  /**
   * Implementation method.
   */
  createSnapshot (): Promise<PartySnapshot> {
    return todo()
    // return this._serviceProvider.services.PartyService.createSnapshot({ partyKey: this.key });
  }

  /**
   * Called by EchoProxy to update this party instance.
   * @internal
   */
  _processPartyUpdate (party: PartyProto) {
    this._key = party.publicKey;
    this._isOpen = party.isOpen;
    this._isActive = party.isActive;
  }
}
