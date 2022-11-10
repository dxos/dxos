//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import {
  ClientServicesProvider,
  ClientServicesProxy,
  ObservableInvitation,
  SpaceInvitationsProxy
} from '@dxos/client-services';
import { todo } from '@dxos/debug';
import { Database, Item, RemoteDatabaseBackend, ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ObjectProperties } from '@dxos/object-model';
import { Party as PartyType, PartyDetails, PartyMember } from '@dxos/protocols/proto/dxos/client';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

export const PARTY_ITEM_TYPE = 'dxos:item/party'; // TODO(burdon): Remove.

// TODO(burdon): Rename Space.
// TODO(burdon): Match params to @dxos/echo-db Space.
// TODO(burdon): Separate public API form implementation (move comments here).
export interface Party {
  get key(): PublicKey;
  get isOpen(): boolean;
  get isActive(): boolean;
  get invitations(): ObservableInvitation[];

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
  createInvitation(): Promise<ObservableInvitation>;

  createSnapshot(): Promise<PartySnapshot>;
}

export class PartyProxy implements Party {
  private readonly _database?: Database;
  private readonly _invitationProxy = new SpaceInvitationsProxy(this._clientServices.services.SpaceInvitationsService);

  private readonly _invitations: ObservableInvitation[] = [];
  public readonly invitationsUpdate = new Event<ObservableInvitation>();
  public readonly stateUpdate = new Event();

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

    this.stateUpdate.emit();
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

  get invitations() {
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
  queryMembers(): ResultSet<PartyMember> {
    return new ResultSet(this.stateUpdate, () => this._party.members ?? []);
  }

  /**
   * Creates an interactive invitation.
   */
  async createInvitation() {
    return new Promise<ObservableInvitation>((resolve, reject) => {
      const invitation = this._invitationProxy.createInvitation(this.key);
      this._invitations.push(invitation);
      const unsubscribe = invitation.subscribe({
        onConnecting: () => {
          this.invitationsUpdate.emit(invitation);
          resolve(invitation);
          unsubscribe();
        },
        onSuccess: () => {
          unsubscribe();
        },
        onError: function (err: any): void {
          unsubscribe();
          reject(err);
        }
      });
    });
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
    console.log('Party._processPartyUpdate', party);
    this._party = party;
    this._key = party.publicKey;
    this._isOpen = party.isOpen;
    this._isActive = party.isActive;
    this.stateUpdate.emit();
  }
}
