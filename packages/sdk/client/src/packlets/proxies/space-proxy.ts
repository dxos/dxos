//
// Copyright 2021 DXOS.org
//

import isEqual from 'lodash.isequal';
import assert from 'node:assert';

import { Event, synchronized, Trigger } from '@dxos/async';
import {
  ClientServicesProvider,
  CancellableInvitationObservable,
  SpaceInvitationsProxy,
  InvitationsOptions
} from '@dxos/client-services';
import { todo } from '@dxos/debug';
import { ISpace, DatabaseBackendProxy, ResultSet, ItemManager } from '@dxos/echo-db';
import { DatabaseRouter, Document, EchoDatabase, Query } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Space as SpaceType, SpaceDetails, SpaceMember } from '@dxos/protocols/proto/dxos/client';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { Properties } from '../proto';

// TODO(burdon): Remove.
export const SPACE_ITEM_TYPE = 'dxos:item/space'; // TODO(burdon): Remove.

interface Internal {
  get db(): DatabaseBackendProxy;
}

// TODO(burdon): Separate public API form implementation (move comments here).
export interface Space extends ISpace {
  get key(): PublicKey;
  get isOpen(): boolean;
  get isActive(): boolean;
  get db(): EchoDatabase;
  get properties(): Document;
  get invitations(): CancellableInvitationObservable[];
  get internal(): Internal;

  open(): Promise<void>;
  close(): Promise<void>;

  /**
   * @deprecated
   */
  setActive(active: boolean): Promise<void>;

  /**
   * @deprecated
   */
  getDetails(): Promise<SpaceDetails>;

  queryMembers(): ResultSet<SpaceMember>;
  createInvitation(options?: InvitationsOptions): CancellableInvitationObservable;
  removeInvitation(id: string): void;

  createSnapshot(): Promise<SpaceSnapshot>;
}

const META_LOAD_TIMEOUT = 3000;

export class SpaceProxy implements Space {
  public readonly invitationsUpdate = new Event<CancellableInvitationObservable | void>();
  public readonly stateUpdate = new Event();

  /**
   * @internal
   * To unlock internal operations that should happen after the database is initialized but before initialize() completes.
   */
  public _databaseInitialized = new Trigger();

  private readonly _db!: EchoDatabase;
  private readonly _internal!: Internal;
  private readonly _dbBackend?: DatabaseBackendProxy;
  private readonly _itemManager?: ItemManager;
  private readonly _invitationProxy: SpaceInvitationsProxy;

  private _invitations: CancellableInvitationObservable[] = [];
  private _properties?: Document;
  private _initialized = false;

  // prettier-ignore
  constructor(
    private _clientServices: ClientServicesProvider,
    private _modelFactory: ModelFactory,
    private _state: SpaceType,
    databaseRouter: DatabaseRouter
  ) {
    assert(this._clientServices.services.SpaceInvitationsService, 'SpaceInvitationsService not available');
    this._invitationProxy = new SpaceInvitationsProxy(this._clientServices.services.SpaceInvitationsService);

    // TODO(burdon): Don't shadow properties.
    if (!this._state.isOpen) { // TODO(burdon): Assert?
      return;
    }

    assert(this._clientServices.services.DataService, 'DataService not available');
    this._dbBackend = new DatabaseBackendProxy(this._clientServices.services.DataService, this.key);
    this._itemManager = new ItemManager(this._modelFactory);

    this._db = new EchoDatabase(this._itemManager, this._dbBackend, databaseRouter);
    this._internal = {
      db: this._dbBackend
    };

    databaseRouter.register(this.key, this._db);
  }

  get key() {
    return this._state.publicKey;
  }

  get isOpen() {
    return this._state.isOpen;
  }

  // TODO(burdon): Remove (depends on properties).
  get isActive() {
    return this._state.isActive;
  }

  get db() {
    return this._db;
  }

  get properties() {
    return this._properties!;
  }

  get invitations() {
    return this._invitations;
  }

  // TODO(burdon): Remove?
  get internal(): Internal {
    return this._internal;
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

    await this._dbBackend!.open(this._itemManager!, this._modelFactory);
    log('database ready');
    this._databaseInitialized.wake();

    {
      // Wait for Properties document.
      const query = this._db.query(Properties.filter());
      if (query.objects.length === 1) {
        this._properties = query.objects[0];
      } else {
        const waitForSpaceMeta = new Trigger();
        const subscription = query.subscribe((query: Query<Properties>) => {
          if (query.objects.length === 1) {
            this._properties = query.objects[0];
            waitForSpaceMeta.wake();
            subscription();
          }
        });

        try {
          await waitForSpaceMeta.wait({ timeout: META_LOAD_TIMEOUT });
        } catch {
          throw new ApiError('Properties not found.');
        } finally {
          subscription();
        }
      }
    }

    this.stateUpdate.emit();
    log('initialized');
  }

  /**
   * Called by EchoProxy close.
   */
  @synchronized
  async destroy() {
    log('destroying...');
    await this._dbBackend?.close();
    await this._itemManager?.destroy();

    log('destroyed');
  }

  async open() {
    await this._setOpen(true);
  }

  async close() {
    await this._setOpen(false);
  }

  async getDetails(): Promise<SpaceDetails> {
    assert(this._clientServices.services.SpaceService, 'SpaceService not available');

    return this._clientServices.services.SpaceService.getSpaceDetails({
      spaceKey: this.key
    });
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
   * Return set of space members.
   * @deprecated
   */
  // TODO(burdon): Don't expose result object and provide type.
  queryMembers(): ResultSet<SpaceMember> {
    return new ResultSet(this.stateUpdate, () => this._state.members ?? []);
  }

  /**
   * Creates an interactive invitation.
   */
  createInvitation(options?: InvitationsOptions) {
    log('create invitation', options);
    const invitation = this._invitationProxy.createInvitation(this.key, options);
    this._invitations = [...this._invitations, invitation];

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
    this._invitations = [...this._invitations.slice(0, index), ...this._invitations.slice(index + 1)];
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
    assert(this._clientServices.services.SpaceService, 'SpaceService not available');

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
    const emitEvent = shouldUpdate(this._state, space);
    this._state = space;
    log('update', { space, emitEvent });
    if (emitEvent) {
      this.stateUpdate.emit();
    }
  }
}

const shouldUpdate = (prev: SpaceType, next: SpaceType) => {
  return !isEqual(prev, next);
};
