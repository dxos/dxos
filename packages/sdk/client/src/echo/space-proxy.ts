//
// Copyright 2021 DXOS.org
//

import * as Schema from 'effect/Schema';
import isEqualWith from 'lodash.isequalwith';

import {
  asyncTimeout,
  Event,
  MulticastObservable,
  scheduleTaskInterval,
  Trigger,
  scheduleMicroTask,
  scheduleTask,
  synchronized,
} from '@dxos/async';
import { type ClientServicesProvider, PropertiesType, type Space, type SpaceInternal } from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context, cancelWithContext } from '@dxos/context';
import { type SpecificCredential, checkCredentialType } from '@dxos/credentials';
import {
  type CustomInspectFunction,
  type CustomInspectable,
  inspectCustom,
  loadashEqualityFn,
  todo,
  warnAfterTimeout,
} from '@dxos/debug';
import {
  type AnyLiveObject,
  type EchoClient,
  type EchoDatabase,
  type EchoDatabaseImpl,
  type SpaceSyncState,
  Filter,
  type QueueFactory,
} from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeService, decodeError } from '@dxos/protocols';
import {
  type Contact,
  CreateEpochRequest,
  Invitation,
  type SpaceArchive,
  type Space as SpaceData,
  type SpaceMember,
  SpaceState,
  type UpdateMemberRoleRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import {
  type Credential,
  type Epoch,
  SpaceMember as HaloSpaceMember,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { InvitationsProxy } from '../invitations';

const EPOCH_CREATION_TIMEOUT = 60_000;

// TODO(burdon): This should not be used as part of the API (don't export).
@trace.resource()
export class SpaceProxy implements Space, CustomInspectable {
  private _ctx = new Context();

  /**
   * Sent whenever any space data changes.
   */
  private readonly _anySpaceUpdate = new Event<SpaceData>();

  /**
   * @internal
   * To update the space query when a space changes.
   */
  // TODO(dmaretskyi): Make private.
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

  private readonly _state = MulticastObservable.from(this._stateUpdate, SpaceState.SPACE_CLOSED);
  private readonly _pipeline = MulticastObservable.from(this._pipelineUpdate, {});
  private readonly _membersUpdate = new Event<SpaceMember[]>();
  private readonly _members = MulticastObservable.from(this._membersUpdate, []);

  private readonly _queues!: QueueFactory;

  private _databaseOpen = false;
  private _error: Error | undefined = undefined;
  private _properties?: AnyLiveObject<any> = undefined;

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

    this._db = echoClient.constructDatabase({ spaceId: this.id, spaceKey: this.key, owningObject: this });
    this._queues = echoClient.constructQueueFactory(this.id);

    const self = this;
    this._internal = {
      get data() {
        return self._data;
      },
      createEpoch: this._createEpoch.bind(this),
      getCredentials: this._getCredentials.bind(this),
      getEpochs: this._getEpochs.bind(this),
      removeMember: this._removeMember.bind(this),
      migrate: this._migrate.bind(this),
      setEdgeReplicationPreference: this._setEdgeReplicationPreference.bind(this),
      syncToEdge: this._syncToEdge.bind(this),
      export: this._export.bind(this),
    };

    this._error = this._data.error ? decodeError(this._data.error) : undefined;

    // Update observables.
    this._stateUpdate.emit(this._currentState);
    this._pipelineUpdate.emit(_data.pipeline ?? {});
    this._membersUpdate.emit(_data.members ?? []);
  }

  toJSON() {
    return {
      id: this.id,
      db: this._db.toJSON(),
      state: SpaceState[this.state.get()],
    };
  }

  get id(): SpaceId {
    return this._data.id as SpaceId;
  }

  @trace.info()
  get key() {
    return this._data.spaceKey;
  }

  get db(): EchoDatabase {
    return this._db;
  }

  get queues(): QueueFactory {
    return this._queues;
  }

  @trace.info()
  get isOpen() {
    return this._data.state === SpaceState.SPACE_READY && this._initialized;
  }

  @trace.info({ depth: 2 })
  get properties(): AnyLiveObject<any> {
    this._throwIfNotInitialized();
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

  get [Symbol.toStringTag](): string {
    return 'SpaceProxy';
  }

  [inspectCustom]: CustomInspectFunction = (depth, options, inspect) => {
    return `${options.stylize(this[Symbol.toStringTag], 'special')} ${inspect({
      id: this.id,
      state: SpaceState[this.state.get()],
    })}`;
  };

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.SPACE_READY` state.
   * Presence is available in `SpaceState.SPACE_CONTROL_ONLY` state.
   */
  @trace.info({ enum: SpaceState })
  private get _currentState(): SpaceState {
    if (this._data.state === SpaceState.SPACE_READY && !this._initialized) {
      return SpaceState.SPACE_INITIALIZING;
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
  async _processSpaceUpdate(space: SpaceData): Promise<void> {
    const emitEvent = shouldUpdate(this._data, space);
    const emitPipelineEvent = shouldPipelineUpdate(this._data, space);
    const emitMembersEvent = shouldMembersUpdate(this._data.members, space.members);
    const isFirstTimeInitializing =
      space.state === SpaceState.SPACE_READY && !(this._initialized || this._initializing);
    const isReopening =
      this._data.state !== SpaceState.SPACE_READY && space.state === SpaceState.SPACE_READY && !this._databaseOpen;
    const shouldReset = this._databaseOpen && space.state === SpaceState.SPACE_REQUIRES_MIGRATION;

    log('update', {
      key: space.spaceKey,
      prevState: SpaceState[this._data.state],
      state: SpaceState[space.state],
      emitEvent,
      emitPipelineEvent,
      emitMembersEvent,
      isFirstTimeInitializing,
      isReopening,
      edgeReplication: space.edgeReplication,
    });

    this._data = space;

    if (isFirstTimeInitializing) {
      await this._initialize();
    } else if (isReopening) {
      await this._initializeDb();
    } else if (shouldReset) {
      await this._reset();
    }

    if (space.error) {
      this._error = decodeError(space.error);
    }

    if (this._initialized) {
      // Transition onto new automerge root.
      const automergeRoot = space.pipeline?.spaceRootUrl;
      if (automergeRoot) {
        log('set space root', { spaceKey: this.key, automergeRoot });
        // NOOP if the root is the same.
        await this._db.setSpaceRoot(automergeRoot);
      }
    }

    this._anySpaceUpdate.emit(space);
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

  private async _initialize(): Promise<void> {
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
  private async _initializeDb(): Promise<void> {
    this._databaseOpen = true;

    {
      const automergeRoot = this._data.pipeline?.spaceRootUrl;
      if (automergeRoot !== undefined) {
        await this._db.setSpaceRoot(automergeRoot);
      } else {
        log.warn('no automerge root found for space', { spaceId: this.id });
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
        .query(Filter.type(PropertiesType), { dataLocation: QueryOptions.DataLocation.LOCAL })
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
  async _destroy(): Promise<void> {
    await this._reset();
  }

  private async _reset(): Promise<void> {
    log('destroying...');
    await this._ctx.dispose();
    this._ctx = new Context();
    await this._invitationsProxy.close();
    await this._db.close();
    this._initializationComplete.reset();
    this._databaseInitialized.reset();
    this._initializing = false;
    this._initialized = false;
    this._databaseOpen = false;
    log('destroyed');
  }

  async open(): Promise<void> {
    await this._clientServices.services.SpacesService!.updateSpace(
      { spaceKey: this.key, state: SpaceState.SPACE_ACTIVE },
      { timeout: RPC_TIMEOUT },
    );
  }

  async close(): Promise<void> {
    if (this._databaseOpen) {
      await this._db.flush();
    }
    await this._clientServices.services.SpacesService!.updateSpace(
      { spaceKey: this.key, state: SpaceState.SPACE_INACTIVE },
      { timeout: RPC_TIMEOUT },
    );
  }

  /**
   * Waits until the space is in the ready state, with database initialized.
   */
  async waitUntilReady(): Promise<this> {
    await cancelWithContext(this._ctx, this._initializationComplete.wait());
    return this;
  }

  /**
   * Post a message to the space.
   */
  async postMessage(channel: string, message: any): Promise<void> {
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
  listen(channel: string, callback: (message: GossipMessage) => void): () => Promise<void> {
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
    this._throwIfNotInitialized();
    log('create invitation', options);
    return this._invitationsProxy.share({ ...options, spaceKey: this.key });
  }

  async admitContact(contact: Contact): Promise<void> {
    await this._clientServices.services.SpacesService!.admitContact({
      spaceKey: this.key,
      role: HaloSpaceMember.Role.ADMIN,
      contact,
    });
  }

  /**
   * Requests member role update.
   */
  updateMemberRole(request: Omit<UpdateMemberRoleRequest, 'spaceKey'>): Promise<void> {
    this._throwIfNotInitialized();
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

  private async _removeMember(memberKey: PublicKey): Promise<void> {
    return this._clientServices.services.SpacesService!.updateMemberRole({
      spaceKey: this.key,
      memberKey,
      newRole: HaloSpaceMember.Role.REMOVED,
    });
  }

  private async _createEpoch({
    migration,
    automergeRootUrl,
  }: { migration?: CreateEpochRequest.Migration; automergeRootUrl?: string } = {}): Promise<void> {
    log('create epoch', { migration, automergeRootUrl });
    const { controlTimeframe: targetTimeframe } = await this._clientServices.services.SpacesService!.createEpoch(
      {
        spaceKey: this.key,
        migration,
        automergeRootUrl,
      },
      { timeout: EPOCH_CREATION_TIMEOUT },
    );

    if (targetTimeframe) {
      await warnAfterTimeout(5_000, 'Waiting for the created epoch to be applied', () =>
        this._anySpaceUpdate.waitForCondition(() => {
          const currentTimeframe = this._data.pipeline?.currentControlTimeframe;
          return (currentTimeframe && Timeframe.dependencies(targetTimeframe, currentTimeframe).isEmpty()) ?? false;
        }),
      );
    }
  }

  private async _getCredentials(): Promise<Credential[]> {
    const stream = this._clientServices.services.SpacesService?.queryCredentials({ spaceKey: this.key, noTail: true });
    invariant(stream, 'SpacesService not available');
    return await Stream.consumeData(stream);
  }

  private async _getEpochs(): Promise<SpecificCredential<Epoch>[]> {
    const credentials = await this._getCredentials();
    return credentials.filter((credential) => checkCredentialType(credential, 'dxos.halo.credentials.Epoch'));
  }

  private async _migrate(): Promise<void> {
    await this._createEpoch({
      migration: CreateEpochRequest.Migration.MIGRATE_REFERENCES_TO_DXN,
    });

    // Needed to have space root set to be able to make next check.
    await this._databaseInitialized.wait();

    if (this._db.coreDatabase.getNumberOfInlineObjects() > 1) {
      await this._createEpoch({
        migration: CreateEpochRequest.Migration.FRAGMENT_AUTOMERGE_ROOT,
      });
    }
  }

  private async _setEdgeReplicationPreference(setting: EdgeReplicationSetting): Promise<void> {
    await this._clientServices.services.SpacesService!.updateSpace(
      {
        spaceKey: this.key,
        edgeReplication: setting,
      },
      { timeout: RPC_TIMEOUT },
    );
    // TODO(dmaretskyi): Might cause a race-condition if the property is updated multiple times.
    await asyncTimeout(
      this._anySpaceUpdate.waitForCondition(() => {
        return this._data.edgeReplication === setting;
      }),
      2_000,
      'Waiting for the edge replication to be enabled',
    );
  }

  private async _syncToEdge(opts?: {
    timeout?: number;
    onProgress: (state: SpaceSyncState.PeerState | undefined) => void;
  }): Promise<void> {
    await using ctx = Context.default();

    if (this._data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
      throw new Error('Edge replication is disabled');
    }

    return await new Promise<void>(async (resolve, reject) => {
      scheduleTask(
        ctx,
        () => {
          reject(new Error('Timeout syncing to EDGE'));
        },
        opts?.timeout ?? 60_000,
      );

      const checkSyncState = (syncState: SpaceSyncState) => {
        const edgePeer = syncState.peers?.find((state) => isEdgePeerId(state.peerId, this.id));

        if (opts?.onProgress) {
          opts.onProgress(edgePeer);
        }

        if (
          edgePeer &&
          edgePeer.missingOnRemote === 0 &&
          edgePeer.missingOnLocal === 0 &&
          edgePeer.differentDocuments === 0
        ) {
          resolve();
        }
      };

      ctx.onDispose(this._db.subscribeToSyncState(ctx, checkSyncState));
      // TODO(dmaretskyi): Still need polling, otherwise this gets stuck.
      scheduleTaskInterval(
        ctx,
        async () => {
          checkSyncState(await this._db.getSyncState());
        },
        1_000,
      );

      checkSyncState(await this._db.getSyncState());
    });
  }

  private _throwIfNotInitialized(): void {
    if (!this._initialized) {
      throw new Error('Space is not initialized.');
    }
  }

  private async _export(): Promise<SpaceArchive> {
    await this._db.flush();
    const { archive } = await this._clientServices.services.SpacesService!.exportSpace({ spaceId: this.id });
    return archive;
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

export const isSpace = (object: unknown): object is Space => object instanceof SpaceProxy;

export const SpaceSchema: Schema.Schema<Space> = Schema.Any.pipe(
  Schema.filter((space) => isSpace(space)),
  Schema.annotations({ title: 'Space' }),
);

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);
