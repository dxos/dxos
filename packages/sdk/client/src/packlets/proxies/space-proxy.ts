//
// Copyright 2021 DXOS.org
//

import { Event, synchronized, Trigger } from '@dxos/async';
import {
  ClientServicesProvider,
  ClientServicesProxy,
  CancellableInvitationObservable,
  SpaceInvitationsProxy,
  InvitationsOptions
} from '@dxos/client-services';
import { todo } from '@dxos/debug';
import { Database, Item, ISpace, DatabaseBackendProxy, ResultSet } from '@dxos/echo-db';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ObjectProperties } from '@dxos/object-model';
import { Space as SpaceType, SpaceDetails, SpaceMember } from '@dxos/protocols/proto/dxos/client';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

export const SPACE_ITEM_TYPE = 'dxos:item/space'; // TODO(burdon): Remove.

// TODO(burdon): Separate public API form implementation (move comments here).
export interface Space extends ISpace {
  get key(): PublicKey;
  get isOpen(): boolean;
  get isActive(): boolean;
  get invitations(): CancellableInvitationObservable[];

  // TODO(burdon): Remove and move accessors to proxy.
  get database(): Database;

  get select(): Database['select'];
  get reduce(): Database['reduce'];

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
  getDetails(): Promise<SpaceDetails>;
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

  queryMembers(): ResultSet<SpaceMember>;

  createInvitation(options?: InvitationsOptions): CancellableInvitationObservable;
  removeInvitation(id: string): void;

  createSnapshot(): Promise<SpaceSnapshot>;
}

export class SpaceProxy implements Space {
  private readonly _database?: Database;
  private readonly _invitationProxy = new SpaceInvitationsProxy(this._clientServices.services.SpaceInvitationsService);
  private readonly _invitations: CancellableInvitationObservable[] = [];

  public readonly invitationsUpdate = new Event<CancellableInvitationObservable | void>();
  public readonly stateUpdate = new Event();

  private _initialized = false;
  private _key: PublicKey;
  private _isOpen: boolean;
  private _isActive: boolean;
  private _item?: Item<ObjectModel>; // TODO(burdon): Rename.

  /**
   * @internal
   * To unlock internal operations that should happen after the database is initialized but before initialize() completes.
   */
  public _databaseInitialized = new Trigger();

  // prettier-ignore
  constructor(
    private _clientServices: ClientServicesProvider,
    private _modelFactory: ModelFactory,
    private _space: SpaceType,
    memberKey: PublicKey // TODO(burdon): Change to identityKey (see optimistic mutations)?
  ) {
    // TODO(burdon): Don't shadow properties.
    this._key = this._space.publicKey;
    this._isOpen = this._space.isOpen;
    this._isActive = this._space.isActive;
    if (!this._space.isOpen) { // TODO(burdon): Assert?
      return;
    }

    // if (true) { // TODO(dima?): Always run database in remote mode for now.
    this._database = new Database(
      this._modelFactory,
      new DatabaseBackendProxy(this._clientServices.services.DataService, this._key),
      memberKey
    );
    // } else if (false) {
    //   // TODO(wittjosiah): Reconcile service provider host with interface.
    //   const space = (this._serviceProvider as any).echo.getSpace(this._key) ?? failUndefined();
    //   this._database = space.database;
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

  get database(): Database {
    if (!this._database) {
      throw new ApiError('Space not open.');
    }

    return this._database;
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   * @deprecated Use database accessor.
   */
  get select(): Database['select'] {
    return this.database.select.bind(this.database);
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   * @deprecated Use database accessor.
   */
  get reduce(): Database['reduce'] {
    return this.database.reduce.bind(this.database);
  }

  /**
   * Called by EchoProxy open.
   */
  @synchronized
  async initialize() {
    if (this._initialized) {
      return;
    }
    log('initializing...');

    // TODO(burdon): Does this need to be set before method completes?
    this._initialized = true;

    await this.database.initialize();
    log('database ready');
    this._databaseInitialized.wake();

    this._item = await this.database.waitForItem<ObjectModel>({ type: SPACE_ITEM_TYPE });

    this.stateUpdate.emit();
    log('initialized');
  }

  /**
   * Called by EchoProxy close.
   */
  @synchronized
  async destroy() {
    log('destroying...');
    if (this._database && this._clientServices instanceof ClientServicesProxy) {
      await this.database.destroy();
    }

    log('destroyed');
  }

  async open() {
    await this._setOpen(true);
  }

  async close() {
    await this._setOpen(false);
  }

  async getDetails(): Promise<SpaceDetails> {
    return this._clientServices.services.SpaceService.getSpaceDetails({
      spaceKey: this._key
    });
  }

  get properties(): ObjectProperties {
    return this._item!.model;
  }

  get invitations() {
    return this._invitations;
  }

  // TODO(burdon): Remove deprecated methods.

  /**
   * @deprecated
   */
  async setActive(active: boolean) {
    // const active_global = options.global ? active : undefined;
    // const active_device = options.device ? active : undefined;
    // await this._serviceProvider.services.SpaceService.setSpaceState({
    //   space_key: this.key,
    //   active_global,
    //   active_device
    // });
  }

  /**
   * @deprecated Use space.properties.
   */
  async setTitle(title: string) {
    // await this.setProperty(SPACE_TITLE_PROPERTY, title);
  }

  /**
   * @deprecated Use space.properties.
   */
  getTitle() {
    return todo();
    // return this.getProperty(SPACE_TITLE_PROPERTY);
  }

  /**
   * @deprecated Use space.properties.
   */
  async setProperty(key: string, value?: any) {
    await this.properties.set(key, value);
  }

  /**
   * @deprecated Use space.properties.
   */
  getProperty(key: string, defaultValue?: any) {
    return this.properties.get(key, defaultValue);
  }

  /**
   * Return set of space members.
   */
  // TODO(burdon): Don't expose result object and provide type.
  queryMembers(): ResultSet<SpaceMember> {
    return new ResultSet(this.stateUpdate, () => this._space.members ?? []);
  }

  /**
   * Creates an interactive invitation.
   */
  createInvitation(options?: InvitationsOptions) {
    log('create invitation', options);
    const invitation = this._invitationProxy.createInvitation(this.key, options);
    this._invitations.push(invitation);

    const unsubscribe = invitation.subscribe({
      onConnecting: () => {
        this.invitationsUpdate.emit(invitation);
        unsubscribe();
      },
      onCancelled: () => {
        unsubscribe();
      },
      onSuccess: () => {
        unsubscribe();
      },
      onError: function (err: any): void {
        unsubscribe();
      }
    });

    return invitation;
  }

  /**
   * Remove invitation from space.
   */
  removeInvitation(id: string) {
    log('remove invitation', { id });
    const index = this._invitations.findIndex((invitation) => invitation.invitation?.invitationId === id);
    void this._invitations[index]?.cancel();
    this._invitations.splice(index, 1);
    this.invitationsUpdate.emit();
  }

  /**
   * Implementation method.
   */
  createSnapshot(): Promise<SpaceSnapshot> {
    return todo();
    // return this._serviceProvider.services.SpaceService.createSnapshot({ space_key: this.key });
  }

  async _setOpen(open: boolean) {
    await this._clientServices.services.SpaceService.setSpaceState({
      spaceKey: this.key,
      open
    });
  }

  /**
   * Called by EchoProxy to update this space instance.
   * @internal
   */
  _processSpaceUpdate(space: SpaceType) {
    this._space = space;
    this._key = space.publicKey;
    this._isOpen = space.isOpen;
    this._isActive = space.isActive;
    log('update', { space });
    this.stateUpdate.emit();
  }
}
