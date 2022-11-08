//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import {
  ClientServicesProvider,
  ClientServicesProxy,
  InvitationObservable,
  SpaceInvitationsProxy
} from '@dxos/client-services';
import { todo } from '@dxos/debug';
import { Database, Item, RemoteDatabaseBackend, ResultSet, streamToResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ObjectProperties } from '@dxos/object-model';
import { Party as PartyType, PartyDetails, PartyMember } from '@dxos/protocols/proto/dxos/client';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

export const PARTY_ITEM_TYPE = 'dxos:item/party'; // TODO(burdon): Remove.

// TODO(burdon): Rename Space.
// TODO(burdon): Separate public API form implementation (move comments here).
export interface Party {
  get key(): PublicKey;
  get isOpen(): boolean;
  get isActive(): boolean;
  get invitations(): InvitationObservable[];

  // TODO(burdon): Verbs should be on same interface.
  get database(): Database;
  get select(): Database['select'];
  get reduce(): Database['reduce'];

  // TODO(burdon): Rename open/close.
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  open(): Promise<void>;
  close(): Promise<void>;

  /**
   * @deprecated
   */
  setActive(active: boolean): Promise<void>;

  /**
   * @deprecated
   */
  // TODO(burdon): Change to `space.properties.title`.
  setTitle(title: string): Promise<void>;
  /**
   * @deprecated
   */
  getTitle(): string;
  /**
   * @deprecated
   */
  getDetails(): Promise<PartyDetails>;
  /**
   * @deprecated
   */
  get properties(): ObjectProperties;
  /**
   * @deprecated
   */
  setProperty(key: string, value?: any): Promise<void>;
  /**
   * @deprecated
   */
  getProperty(key: string, defaultValue?: any): any;

  queryMembers(): ResultSet<PartyMember>;
  createInvitation(): InvitationObservable;

  createSnapshot(): Promise<PartySnapshot>;
}

export class PartyProxy implements Party {
  private readonly _database?: Database;
  private readonly _invitationProxy = new SpaceInvitationsProxy(this._clientServices.services.SpaceInvitationsService);

  // TODO(burdon): Spy on stream.
  // TODO(burdon): Event when updated.
  private readonly _invitations: InvitationObservable[] = [];
  public readonly invitationsUpdate = new Event<InvitationObservable>();

  private _key: PublicKey;
  private _isOpen: boolean;
  private _isActive: boolean;
  private _item?: Item<ObjectModel>;

  // prettier-ignore
  constructor(
    private _clientServices: ClientServicesProvider,
    private _modelFactory: ModelFactory,
    private _party: PartyType,
    memberKey: PublicKey // TODO(burdon): Change to identityKey (see optimistic mutations)?
  ) {
    // TODO(burdon): Don't shadow properties.
    this._key = this._party.publicKey;
    this._isOpen = this._party.isOpen;
    this._isActive = this._party.isActive;
    if (!this._party.isOpen) { // TODO(burdon): Assert?
      return;
    }

    // if (true) { // TODO(dima?): Always run database in remote mode for now.
    this._database = new Database(
      this._modelFactory,
      new RemoteDatabaseBackend(this._clientServices.services.DataService, this._key),
      memberKey
    );
    // } else if (false) {
    //   // TODO(wittjosiah): Reconcile service provider host with interface.
    //   const party = (this._serviceProvider as any).echo.getParty(this._key) ?? failUndefined();
    //   this._database = party.database;
    // } else {
    //   throw new Error('Unrecognized service provider.');
    // }
  }

  get key() {
    return this._key;
  }

  get isOpen() {
    return this._isOpen;
  }

  // TODO(burdon): Remove (depends on properties).
  get isActive() {
    return this._isActive;
  }

  // TODO(burdon): Invert party/database? (e.g., const db = client.connect()).
  get database(): Database {
    if (!this._database) {
      throw new Error('Party not open.');
    }

    return this._database;
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   */
  // TODO(burdon): Remove (use database).
  get select(): Database['select'] {
    return this.database.select.bind(this.database);
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   */
  // TODO(burdon): Remove (use database).
  get reduce(): Database['reduce'] {
    return this.database.reduce.bind(this.database);
  }

  /**
   * Called by EchoProxy open.
   */
  async initialize() {
    // if (this._database && this._serviceProvider instanceof ClientServicesProxy) {
    await this._database!.initialize();
    // }

    // Root item for properties.
    this._item = await this._database?.createItem({ type: PARTY_ITEM_TYPE });
  }

  /**
   * Called by EchoProxy close.
   */
  async destroy() {
    if (this._database && this._clientServices instanceof ClientServicesProxy) {
      await this._database.destroy();
    }
  }

  async open() {
    await this._setOpen(true);
  }

  async close() {
    await this._setOpen(false);
  }

  async getDetails(): Promise<PartyDetails> {
    return this._clientServices.services.PartyService.getPartyDetails({
      partyKey: this._key
    });
  }

  async _setOpen(open: boolean) {
    await this._clientServices.services.PartyService.setPartyState({
      partyKey: this.key,
      open
    });
  }

  async setActive(active: boolean) {
    // const active_global = options.global ? active : undefined;
    // const active_device = options.device ? active : undefined;
    // await this._serviceProvider.services.PartyService.setPartyState({
    //   party_key: this.key,
    //   active_global,
    //   active_device
    // });
  }

  get properties(): ObjectProperties {
    return this._item!.model;
  }

  get invitations(): InvitationObservable[] {
    return this._invitations;
  }

  /**
   * @deprecated Use party.properties.
   */
  async setTitle(title: string) {
    // await this.setProperty(PARTY_TITLE_PROPERTY, title);
  }

  /**
   * @deprecated Use party.properties.
   */
  getTitle() {
    return todo();
    // return this.getProperty(PARTY_TITLE_PROPERTY);
  }

  /**
   * @deprecated Use party.properties.
   */
  async setProperty(key: string, value?: any) {
    await this.properties.set(key, value);
  }

  /**
   * @deprecated Use party.properties.
   */
  getProperty(key: string, defaultValue?: any) {
    return this.properties.get(key, defaultValue);
  }

  /**
   * Return set of party members.
   */
  // TODO(burdon): Don't expose result object and provide type.
  queryMembers() {
    return streamToResultSet(
      this._clientServices.services.PartyService.subscribeMembers({ partyKey: this.key }),
      (response) => response?.members ?? []
    );
  }

  /**
   * Creates an interactive invitation.
   */
  createInvitation() {
    const observer = this._invitationProxy.createInvitation(this.key);
    this._invitations.push(observer);
    this.invitationsUpdate.emit(observer);
    return observer;
  }

  /**
   * Implementation method.
   */
  createSnapshot(): Promise<PartySnapshot> {
    return todo();
    // return this._serviceProvider.services.PartyService.createSnapshot({ party_key: this.key });
  }

  /**
   * Called by EchoProxy to update this party instance.
   * @internal
   */
  _processPartyUpdate(party: PartyType) {
    this._key = party.publicKey;
    this._isOpen = party.isOpen;
    this._isActive = party.isActive;
  }
}
