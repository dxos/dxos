//
// Copyright 2021 DXOS.org
//

import isEqual from 'lodash.isequal';
import assert from 'node:assert';

import { Event, synchronized, Trigger, UnsubscribeCallback } from '@dxos/async';
import { todo } from '@dxos/debug';
import { DatabaseBackendProxy, ItemManager } from '@dxos/echo-db';
import { DatabaseRouter, Document, EchoDatabase, Query } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Space as SpaceType, SpaceMember, SpaceStatus } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { ClientServicesProvider } from '../client';
import { CancellableInvitationObservable, InvitationsOptions, SpaceInvitationsProxy } from '../invitations';
import { Properties } from '../proto';

interface Internal {
  get db(): DatabaseBackendProxy;
}

// TODO(burdon): Separate public API form implementation (move comments here).
export interface Space {
  get key(): PublicKey;
  get isOpen(): boolean;
  get db(): EchoDatabase;
  get properties(): Document;
  get invitations(): CancellableInvitationObservable[];
  get internal(): Internal;

  open(): Promise<void>;
  close(): Promise<void>;

  getMembers(): SpaceMember[];
  subscribeMembers(callback: (members: SpaceMember[]) => void): UnsubscribeCallback;

  postMessage: (channel: string, message: any) => Promise<void>;

  listen: (channel: string, callback: (message: GossipMessage) => void) => UnsubscribeCallback;

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
  public readonly _databaseInitialized = new Trigger();

  private readonly _db!: EchoDatabase;
  private readonly _internal!: Internal;
  private readonly _dbBackend?: DatabaseBackendProxy;
  private readonly _itemManager?: ItemManager;
  private readonly _invitationProxy: SpaceInvitationsProxy;

  private _invitations: CancellableInvitationObservable[] = [];
  private _properties?: Document;
  private _initializing = false;

  /**
   * @internal
   */
  _initialized = false;

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
    if (this._state.status !== SpaceStatus.ACTIVE) { // TODO(burdon): Assert?
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
    return this._state.spaceKey;
  }

  get isOpen() {
    return this._state.status === SpaceStatus.ACTIVE;
  }

  get db() {
    return this._db;
  }

  get properties() {
    assert(this._properties, 'Properties not initialized.');
    return this._properties;
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
    if (this._initializing || this._initialized) {
      return;
    }
    log('initializing...');

    // TODO(burdon): Does this need to be set before method completes?
    this._initializing = true;

    await this._dbBackend!.open(this._itemManager!, this._modelFactory);
    log('ready');
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

    this._initialized = true;
    this._initializing = false;
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

  /**
   * Post a message to the space.
   */
  async postMessage(channel: string, message: any) {
    assert(this._clientServices.services.SpacesService, 'SpacesService not available');
    await this._clientServices.services.SpacesService.postMessage({
      spaceKey: this.key,
      channel,
      message: { ...message, '@type': message['@type'] || 'google.protobuf.Struct' }
    });
  }

  /**
   * Listen for messages posted to the space.
   */
  listen(channel: string, callback: (message: GossipMessage) => void) {
    assert(this._clientServices.services.SpacesService, 'SpacesService not available');
    const stream = this._clientServices.services.SpacesService.subscribeMessages({ spaceKey: this.key, channel });
    stream.subscribe(callback);
    return () => stream.close();
  }

  /**
   * Return set of space members.
   */
  getMembers(): SpaceMember[] {
    return this._state.members ?? [];
  }

  /**
   * Subscribe to changes to space members.
   */
  subscribeMembers(callback: (members: SpaceMember[]) => void): UnsubscribeCallback {
    return this.stateUpdate.on(() => callback(this.getMembers()));
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
    return todo();
    // assert(this._clientServices.services.SpaceService, 'SpaceService not available');

    // await this._clientServices.services.SpaceService.setSpaceState({
    //   spaceKey: this.key,
    //   open
    // });
  }

  /**
   * Called by EchoProxy to update this space instance.
   * @internal
   */
  // TODO(wittjosiah): Make private and trigger with event?
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
