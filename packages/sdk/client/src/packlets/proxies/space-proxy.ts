//
// Copyright 2021 DXOS.org
//

import isEqual from 'lodash.isequal';
import isEqualWith from 'lodash.isequalwith';
import assert from 'node:assert';

import { Event, MulticastObservable, synchronized, Trigger, UnsubscribeCallback } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { loadashEqualityFn, todo } from '@dxos/debug';
import { DatabaseBackendProxy, ItemManager } from '@dxos/echo-db';
import { DatabaseRouter, TypedObject, EchoDatabase } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Invitation, Space as SpaceData, SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { ClientServicesProvider } from '../client';
import { CancellableInvitationObservable, InvitationsProxy } from '../invitations';
import { Properties } from '../proto';

interface Internal {
  get db(): DatabaseBackendProxy;
}

// TODO(burdon): Separate public API form implementation (move comments here).
export interface Space {
  get key(): PublicKey;
  get isOpen(): boolean;

  /**
   * Echo database.
   */
  get db(): EchoDatabase;

  /**
   * Properties object.
   */
  get properties(): TypedObject;

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.READY` state.
   * Presence is available in `SpaceState.INACTIVE` state.
   */
  get state(): MulticastObservable<SpaceState>;

  /**
   * Current state of space pipeline.
   */
  get pipeline(): MulticastObservable<SpaceData.PipelineState>;

  get invitations(): MulticastObservable<CancellableInvitationObservable[]>;
  get members(): MulticastObservable<SpaceMember[]>;

  get internal(): Internal;

  open(): Promise<void>;
  close(): Promise<void>;

  /**
   * Waits until the space is in the ready state, with database initialized.
   */
  waitUntilReady(): Promise<this>;

  postMessage: (channel: string, message: any) => Promise<void>;
  listen: (channel: string, callback: (message: GossipMessage) => void) => UnsubscribeCallback;

  createInvitation(options?: Partial<Invitation>): CancellableInvitationObservable;
  removeInvitation(id: string): void;

  createSnapshot(): Promise<SpaceSnapshot>;
}

const META_LOAD_TIMEOUT = 3000;

export class SpaceProxy implements Space {
  private readonly _ctx = new Context();
  /**
   * @internal
   * To update the space query when a space changes.
   */
  // TODO(wittjosiah): Remove this? Should be consistent w/ ECHO query.
  public readonly _stateUpdate = new Event<SpaceState>();

  private readonly _pipelineUpdate = new Event<SpaceData.PipelineState>();

  // TODO(dmaretskyi): Reconcile initialization states.

  /**
   * @internal
   * To unlock internal operations that should happen after the database is initialized but before initialize() completes.
   */
  public readonly _databaseInitialized = new Trigger();

  /**
   * @internal
   * Space proxy is fully initialized, database open, state is READY.
   */
  public readonly _initializationComplete = new Trigger();

  private _initializing = false;

  /**
   * @internal
   */
  _initialized = false;

  private readonly _invitationsUpdate = new Event<CancellableInvitationObservable[]>();
  private readonly _membersUpdate = new Event<SpaceMember[]>();

  private readonly _db!: EchoDatabase;
  private readonly _internal!: Internal;
  private readonly _dbBackend?: DatabaseBackendProxy;
  private readonly _itemManager?: ItemManager;
  private readonly _invitationProxy: InvitationsProxy;

  private readonly _state = MulticastObservable.from(this._stateUpdate, SpaceState.CLOSED);
  private readonly _pipeline = MulticastObservable.from(this._pipelineUpdate, {});
  private readonly _invitations = MulticastObservable.from(this._invitationsUpdate, []);
  private readonly _members = MulticastObservable.from(this._membersUpdate, []);

  // TODO(dmaretskyi): Cache properties in the metadata.
  private _cachedProperties = new Properties({
    name: 'Loading...'
  });

  private _properties?: TypedObject;

  // prettier-ignore
  constructor(
    private _clientServices: ClientServicesProvider,
    private _modelFactory: ModelFactory,
    private _data: SpaceData,
    databaseRouter: DatabaseRouter
  ) {
    assert(this._clientServices.services.InvitationsService, 'InvitationsService not available');
    this._invitationProxy = new InvitationsProxy(this._clientServices.services.InvitationsService, () => ({
      kind: Invitation.Kind.SPACE,
      spaceKey: this.key
    }));

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
    return this._data.spaceKey;
  }

  get isOpen() {
    return this._data.state === SpaceState.READY && this._initialized;
  }

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.READY` state.
   * Presence is available in `SpaceState.INACTIVE` state.
   */
  private get _currentState(): SpaceState {
    if (this._data.state === SpaceState.READY && !this._initialized) {
      return SpaceState.INITIALIZING;
    } else {
      return this._data.state;
    }
  }

  get db() {
    return this._db;
  }

  get properties() {
    if (this._currentState !== SpaceState.READY) {
      return this._cachedProperties;
    } else {
      assert(this._properties, 'Properties not initialized.');
      return this._properties;
    }
  }

  get state() {
    return this._state;
  }

  /**
   * @inheritdoc
   */
  get pipeline() {
    return this._pipeline;
  }

  /**
   * @inheritdoc
   */
  get invitations() {
    return this._invitations;
  }

  /**
   * @inheritdoc
   */
  get members() {
    return this._members;
  }

  /**
   * @inheritdoc
   */
  // TODO(burdon): Remove?
  get internal(): Internal {
    return this._internal;
  }

  /**
   * Called by EchoProxy to update this space instance.
   * Called once on initial creation.
   * @internal Package-private.
   */
  @synchronized
  async _processSpaceUpdate(space: SpaceData) {
    const emitEvent = shouldUpdate(this._data, space);
    const emitPipelineEvent = shouldPipelineUpdate(this._data, space);
    const emitMembersEvent = shouldMembersUpdate(this._data.members, space.members);

    this._data = space;
    log('update', { space, emitEvent });

    if (space.state === SpaceState.READY && !(this._initialized || this._initializing)) {
      await this._initialize();
    }

    if (emitEvent) {
      this._stateUpdate.emit(this._currentState);
    }
    if (emitPipelineEvent) {
      this._pipelineUpdate.emit(space.pipeline ?? {});
    }
    if (emitMembersEvent) {
      this._membersUpdate.emit(space.members!);
    }
  }

  private async _initialize() {
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
        const subscription = query.subscribe((query) => {
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

    assert(this._properties);
    this._initialized = true;
    this._initializing = false;
    this._initializationComplete.wake();
    this._stateUpdate.emit(this._currentState);
    this._data.members && this._membersUpdate.emit(this._data.members);
    log('initialized');
  }

  /**
   * Called by EchoProxy close.
   * @internal Package-private.
   */
  @synchronized
  async _destroy() {
    log('destroying...');
    await this._ctx.dispose();
    await this._dbBackend?.close();
    await this._itemManager?.destroy();
    log('destroyed');
  }

  /**
   * TODO
   */
  async open() {
    await this._setOpen(true);
  }

  /**
   * TODO
   */
  async close() {
    await this._setOpen(false);
  }

  /**
   * Waits until the space is in the ready state, with database initialized.
   */
  async waitUntilReady() {
    await cancelWithContext(this._ctx, this._initializationComplete.wait());
    return this;
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
   * Creates an interactive invitation.
   */
  createInvitation(options?: Partial<Invitation>) {
    log('create invitation', options);
    const invitation = this._invitationProxy.createInvitation(options);
    this._invitationsUpdate.emit([...this._invitations.get(), invitation]);

    return invitation;
  }

  /**
   * Remove invitation from space.
   */
  removeInvitation(id: string) {
    log('remove invitation', { id });
    const invitations = this._invitations.get();
    const index = invitations.findIndex((invitation) => invitation.get().invitationId === id);
    void invitations[index]?.cancel();
    this._invitationsUpdate.emit([...invitations.slice(0, index), ...invitations.slice(index + 1)]);
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
}

const shouldUpdate = (prev: SpaceData, next: SpaceData) => {
  return prev.state !== next.state;
};

const shouldPipelineUpdate = (prev: SpaceData, next: SpaceData) => {
  return !isEqualWith(prev.pipeline, next.pipeline, loadashEqualityFn);
};

const shouldMembersUpdate = (prev: SpaceMember[] | undefined, next: SpaceMember[] | undefined) => {
  if (!next) {
    return false;
  }

  return !isEqual(prev, next);
};
