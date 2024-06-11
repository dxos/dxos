//
// Copyright 2021 DXOS.org
//

import isEqualWith from 'lodash.isequalwith';

import { Event, MulticastObservable, scheduleMicroTask, synchronized, Trigger } from '@dxos/async';
import { type ClientServicesProvider, type Space, type SpaceInternal, Properties } from '@dxos/client-protocol';
import { cancelWithContext, Context } from '@dxos/context';
import { checkCredentialType } from '@dxos/credentials';
import { loadashEqualityFn, todo, warnAfterTimeout } from '@dxos/debug';
import { type EchoDatabaseImpl, type EchoDatabase, Filter, type EchoClient } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { decodeError } from '@dxos/protocols';
import {
  Invitation,
  SpaceState,
  type CreateEpochRequest,
  type Space as SpaceData,
  type SpaceMember,
  type UpdateMemberRoleRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { InvitationsProxy } from '../invitations';

// TODO(burdon): This should not be used as part of the API (don't export).
@trace.resource()
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

  @trace.info()
  private _initializing = false;

  /**
   * @internal
   */
  @trace.info()
  _initialized = false;

  private readonly _db!: EchoDatabaseImpl;
  private readonly _internal!: SpaceInternal;
  private readonly _invitationsProxy: InvitationsProxy;

  private readonly _state = MulticastObservable.from(this._stateUpdate, SpaceState.CLOSED);
  private readonly _pipeline = MulticastObservable.from(this._pipelineUpdate, {});
  private readonly _membersUpdate = new Event<SpaceMember[]>();
  private readonly _members = MulticastObservable.from(this._membersUpdate, []);

  private _databaseOpen = false;
  private _error: Error | undefined = undefined;
  private _properties?: EchoReactiveObject<any> = undefined;

  constructor(
    private _clientServices: ClientServicesProvider,
    private _data: SpaceData,
    echoClient: EchoClient,
  ) {
    log('construct', { key: _data.spaceKey, state: SpaceState[_data.state] });
    invariant(this._clientServices.services.InvitationsService, 'InvitationsService not available');
    this._invitationsProxy = new InvitationsProxy(
      this._clientServices.services.InvitationsService,
      this._clientServices.services.IdentityService,
      () => ({
        kind: Invitation.Kind.SPACE,
        spaceKey: this.key,
      }),
    );

    this._db = echoClient.constructDatabase({ spaceKey: this.key, owningObject: this });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this._internal = {
      get data() {
        return self._data;
      },
      createEpoch: this._createEpoch.bind(this),
      removeMember: this._removeMember.bind(this),
    };

    this._error = this._data.error ? decodeError(this._data.error) : undefined;

    // Update observables.
    this._stateUpdate.emit(this._currentState);
    this._pipelineUpdate.emit(_data.pipeline ?? {});
    this._membersUpdate.emit(_data.members ?? []);
  }

  @trace.info()
  get key() {
    return this._data.spaceKey;
  }

  get db(): EchoDatabase {
    return this._db;
  }

  @trace.info()
  get isOpen() {
    return this._data.state === SpaceState.READY && this._initialized;
  }

  @trace.info({ depth: 2 })
  get properties(): EchoReactiveObject<any> {
    if (!this._initialized) {
      throw new Error('Space is not initialized');
    }
    invariant(this._properties, 'Properties not available');
    return this._properties;
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
    return this._invitationsProxy.created;
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
  get internal(): SpaceInternal {
    return this._internal;
  }

  get error(): Error | undefined {
    return this._error;
  }

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.READY` state.
   * Presence is available in `SpaceState.CONTROL_ONLY` state.
   */
  @trace.info({ enum: SpaceState })
  private get _currentState(): SpaceState {
    if (this._data.state === SpaceState.READY && !this._initialized) {
      return SpaceState.INITIALIZING;
    } else {
      return this._data.state;
    }
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
    const isFirstTimeInitializing = space.state === SpaceState.READY && !(this._initialized || this._initializing);
    const isReopening =
      this._data.state !== SpaceState.READY && space.state === SpaceState.READY && !this._databaseOpen;

    log('update', {
      key: space.spaceKey,
      prevState: SpaceState[this._data.state],
      state: SpaceState[space.state],
      emitEvent,
      emitPipelineEvent,
      emitMembersEvent,
      isFirstTimeInitializing,
      isReopening,
    });

    this._data = space;

    if (isFirstTimeInitializing) {
      await this._initialize();
    } else if (isReopening) {
      await this._initializeDb();
    }

    if (space.error) {
      this._error = decodeError(space.error);
    }

    if (this._initialized) {
      // Transition onto new automerge root.
      const automergeRoot = space.pipeline?.currentEpoch?.subject.assertion.automergeRoot;
      if (automergeRoot) {
        log('set space root', { automergeRoot });
        // NOOP if the root is the same.
        await this._db.setSpaceRoot(automergeRoot);
      }
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

    log('initializing...', { space: this.key });
    this._initializing = true;
    await this._invitationsProxy.open();
    await this._initializeDb();

    this._initialized = true;
    this._initializing = false;
    this._initializationComplete.wake();
    this._stateUpdate.emit(this._currentState);
    this._data.members && this._membersUpdate.emit(this._data.members);
    log('initialized', { space: this.key });
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _initializeDb() {
    this._databaseOpen = true;

    {
      let automergeRoot;
      if (this._data.pipeline?.currentEpoch) {
        invariant(checkCredentialType(this._data.pipeline.currentEpoch, 'dxos.halo.credentials.Epoch'));
        automergeRoot = this._data.pipeline.currentEpoch.subject.assertion.automergeRoot;
      }

      if (automergeRoot !== undefined) {
        await this._db.setSpaceRoot(automergeRoot);
      }
      await this._db.open();
    }

    log('ready');

    this._databaseInitialized.wake();

    const propertiesAvailable = new Trigger();
    // Set properties document when it's available.
    // NOTE: Emits state update event when properties are first available.
    //   This is needed to ensure reactivity for newly created spaces.
    // TODO(wittjosiah): Transfer subscriptions from cached properties to the new properties object.
    {
      const unsubscribe = this._db
        .query(Filter.schema(Properties), { dataLocation: QueryOptions.DataLocation.LOCAL })
        .subscribe(
          (query) => {
            if (query.objects.length === 1) {
              this._properties = query.objects[0];
              propertiesAvailable.wake();
              this._stateUpdate.emit(this._currentState);
              scheduleMicroTask(this._ctx, () => {
                unsubscribe();
              });
            }
          },
          { fire: true },
        );
    }
    await warnAfterTimeout(5_000, 'Finding properties for a space', () =>
      cancelWithContext(this._ctx, propertiesAvailable.wait()),
    );
  }

  /**
   * Called by EchoProxy close.
   * @internal Package-private.
   */
  @synchronized
  async _destroy() {
    log('destroying...');
    await this._ctx.dispose();
    await this._invitationsProxy.close();
    await this._db.close();
    this._databaseOpen = false;
    log('destroyed');
  }

  async open() {
    await this._clientServices.services.SpacesService!.updateSpace({ spaceKey: this.key, state: SpaceState.ACTIVE });
  }

  async close() {
    await this._db.flush();
    await this._clientServices.services.SpacesService!.updateSpace({ spaceKey: this.key, state: SpaceState.INACTIVE });
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
    invariant(this._clientServices.services.SpacesService, 'SpacesService not available');
    await this._clientServices.services.SpacesService.postMessage(
      {
        spaceKey: this.key,
        channel,
        message: { ...message, '@type': message['@type'] || 'google.protobuf.Struct' },
      },
      { timeout: RPC_TIMEOUT },
    );
  }

  /**
   * Listen for messages posted to the space.
   */
  listen(channel: string, callback: (message: GossipMessage) => void) {
    invariant(this._clientServices.services.SpacesService, 'SpacesService not available');
    const stream = this._clientServices.services.SpacesService.subscribeMessages(
      { spaceKey: this.key, channel },
      { timeout: RPC_TIMEOUT },
    );
    stream.subscribe(callback);
    return () => stream.close();
  }

  /**
   * Creates a delegated or interactive invitation.
   */
  share(options?: Partial<Invitation>) {
    log('create invitation', options);
    return this._invitationsProxy.share({ ...options, spaceKey: this.key });
  }

  /**
   * Requests member role update.
   */
  updateMemberRole(request: Omit<UpdateMemberRoleRequest, 'spaceKey'>) {
    return this._clientServices.services.SpacesService!.updateMemberRole({
      spaceKey: this.key,
      memberKey: request.memberKey,
      newRole: request.newRole,
    });
  }

  /**
   * Implementation method.
   */
  createSnapshot(): Promise<SpaceSnapshot> {
    return todo();
    // return this._serviceProvider.services.SpaceService.createSnapshot({ space_key: this.key });
  }

  toJSON() {
    return {
      key: this.key.toHex(),
      state: SpaceState[this.state.get()],
    };
  }

  private async _createEpoch({
    migration,
    automergeRootUrl,
  }: { migration?: CreateEpochRequest.Migration; automergeRootUrl?: string } = {}) {
    await this._clientServices.services.SpacesService!.createEpoch({ spaceKey: this.key, migration, automergeRootUrl });
  }

  private async _removeMember(memberKey: PublicKey) {
    return this._clientServices.services.SpacesService!.updateMemberRole({
      spaceKey: this.key,
      memberKey,
      newRole: HaloSpaceMember.Role.REMOVED,
    });
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

  return !isEqualWith(prev, next, loadashEqualityFn);
};
