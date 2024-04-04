//
// Copyright 2021 DXOS.org
//

import isEqualWith from 'lodash.isequalwith';

import { Event, MulticastObservable, scheduleMicroTask, synchronized, Trigger } from '@dxos/async';
import { type ClientServicesProvider, type Space, type SpaceInternal, PropertiesSchema } from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf';
import { cancelWithContext, Context } from '@dxos/context';
import { checkCredentialType } from '@dxos/credentials';
import { loadashEqualityFn, todo, warnAfterTimeout } from '@dxos/debug';
import {
  EchoDatabaseImpl,
  type AutomergeContext,
  type EchoDatabase,
  type Hypergraph,
  Filter,
  type EchoReactiveObject,
} from '@dxos/echo-schema';
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
} from '@dxos/protocols/proto/dxos/client/services';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { trace } from '@dxos/tracing';

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

  // TODO(burdon): Change to state property.
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
    graph: Hypergraph,
    automergeContext: AutomergeContext,
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

    invariant(this._clientServices.services.DataService, 'DataService not available');
    this._db = new EchoDatabaseImpl({
      spaceKey: this.key,
      graph,
      automergeContext,
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this._internal = {
      get db(): never {
        throw new Error('Use space.db instead');
      },
      get data() {
        return self._data;
      },
      createEpoch: this._createEpoch.bind(this),
      open: this._activate.bind(this),
      close: this._deactivate.bind(this),
      removeMember: this._removeMember.bind(this),
    };

    this._error = this._data.error ? decodeError(this._data.error) : undefined;

    graph._register(this.key, this._db, this);

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
        // NOOP if the root is the same.
        await this._db.automerge.update({ rootUrl: automergeRoot });
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
    log('initializing...');

    // TODO(burdon): Does this need to be set before method completes?
    this._initializing = true;

    await this._invitationsProxy.open();

    await this._initializeDb();

    this._initialized = true;
    this._initializing = false;
    this._initializationComplete.wake();
    this._stateUpdate.emit(this._currentState);
    this._data.members && this._membersUpdate.emit(this._data.members);
    log('initialized');
  }

  private async _initializeDb() {
    this._databaseOpen = true;

    {
      let automergeRoot;
      if (this._data.pipeline?.currentEpoch) {
        invariant(checkCredentialType(this._data.pipeline.currentEpoch, 'dxos.halo.credentials.Epoch'));
        automergeRoot = this._data.pipeline.currentEpoch.subject.assertion.automergeRoot;
      }

      await this._db.automerge.open({
        rootUrl: automergeRoot,
      });
    }

    log('ready');

    this._databaseInitialized.wake();

    const propertiesAvailable = new Trigger();
    // Set properties document when it's available.
    // NOTE: Emits state update event when properties are first available.
    //   This is needed to ensure reactivity for newly created spaces.
    // TODO(wittjosiah): Transfer subscriptions from cached properties to the new properties object.
    {
      const unsubscribe = this._db.query(Filter.schema(PropertiesSchema)).subscribe((query) => {
        if (query.objects.length === 1) {
          this._properties = query.objects[0];
          propertiesAvailable.wake();
          this._stateUpdate.emit(this._currentState);
          scheduleMicroTask(this._ctx, () => {
            unsubscribe();
          });
        }
      }, true);
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
    await this._db.automerge.close();
    this._databaseOpen = false;
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
    invariant(this._clientServices.services.SpacesService, 'SpacesService not available');
    await this._clientServices.services.SpacesService.postMessage({
      spaceKey: this.key,
      channel,
      message: { ...message, '@type': message['@type'] || 'google.protobuf.Struct' },
    });
  }

  /**
   * Listen for messages posted to the space.
   */
  listen(channel: string, callback: (message: GossipMessage) => void) {
    invariant(this._clientServices.services.SpacesService, 'SpacesService not available');
    const stream = this._clientServices.services.SpacesService.subscribeMessages({ spaceKey: this.key, channel });
    stream.subscribe(callback);
    return () => stream.close();
  }

  /**
   * Creates an interactive invitation.
   */
  share(options?: Partial<Invitation>) {
    log('create invitation', options);
    return this._invitationsProxy.share({ ...options, spaceKey: this.key });
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
    // invariant(this._clientServices.services.SpaceService, 'SpaceService not available');

    // await this._clientServices.services.SpaceService.setSpaceState({
    //   spaceKey: this.key,
    //   open
    // });
  }

  private async _createEpoch({ migration }: { migration?: CreateEpochRequest.Migration } = {}) {
    await this._clientServices.services.SpacesService!.createEpoch({ spaceKey: this.key, migration });
  }

  private async _activate() {
    await this._clientServices.services.SpacesService!.updateSpace({ spaceKey: this.key, state: SpaceState.ACTIVE });
  }

  private async _deactivate() {
    await this._db.flush();
    await this._clientServices.services.SpacesService!.updateSpace({ spaceKey: this.key, state: SpaceState.INACTIVE });
  }

  private async _removeMember(memberKey: PublicKey) {
    if (!this._members.get().find((member) => member.identity.identityKey.equals(memberKey))) {
      throw new Error(`Member ${memberKey} not found`);
    }

    const credentials = await Stream.consumeData(
      this._clientServices.services.SpacesService!.queryCredentials({ spaceKey: this.key, noTail: true }),
    );
    const credential = credentials.find(
      (credential) =>
        checkCredentialType(credential, 'dxos.halo.credentials.SpaceMember') && credential.subject.id.equals(memberKey),
    );
    if (!credential) {
      throw new Error(`Credential for ${memberKey} not found`);
    }
    if (!credential.id) {
      throw new Error(`Credential for ${memberKey} does not have an id`);
    }

    const identityQuery = await Stream.first(this._clientServices.services.IdentityService!.queryIdentity());
    const identityKey = identityQuery?.identity?.identityKey;
    invariant(identityKey, 'Identity key not found');

    await this._clientServices.services.SpacesService!.writeCredentials({
      spaceKey: this.key,
      credentials: [
        {
          issuer: identityKey,
          issuanceDate: new Date(),
          subject: {
            id: credential.id,
            assertion: {
              '@type': 'dxos.halo.credentials.Revocation',
            },
          },
        },
      ],
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
