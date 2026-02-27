//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import {
  Event,
  MulticastObservable,
  PushStream,
  SubscriptionList,
  Trigger,
  asyncTimeout,
  scheduleMicroTask,
} from '@dxos/async';
import {
  CREATE_SPACE_TIMEOUT,
  type ClientServicesProvider,
  type Echo,
  IMPORT_SPACE_TIMEOUT,
  type Space,
  SpaceProperties,
} from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { getCredentialAssertion } from '@dxos/credentials';
import { failUndefined, inspectObject } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import { type Database } from '@dxos/echo';
import { type EchoClient, Filter, Query } from '@dxos/echo-db';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ApiError, trace as Trace } from '@dxos/protocols';
import { EMPTY, toPublicKey, encodePublicKey } from '@dxos/protocols/buf';
import { type Invitation, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type QuerySpacesResponse,
  type Space as SerializedSpace,
  type SpaceArchive,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type IndexConfig } from '@dxos/protocols/buf/dxos/echo/indexing_pb';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { type HaloProxy } from '../halo/halo-proxy';
import { InvitationsProxy } from '../invitations';

import { SpaceProxy } from './space-proxy';

const IDENTITY_WAIT_TIMEOUT = 1_000;

@trace.resource()
export class SpaceList extends MulticastObservable<Space[]> implements Echo {
  private _ctx!: Context;
  private _invitationProxy?: InvitationsProxy;
  private _defaultSpaceId?: SpaceId;
  private readonly _defaultSpaceAvailable = new PushStream<boolean>();
  private readonly _isReady = new MulticastObservable(this._defaultSpaceAvailable.observable, false);
  private readonly _spacesStream: PushStream<Space[]>;
  private readonly _spaceCreated = new Event<PublicKey>();
  private readonly _instanceId = PublicKey.random().toHex();

  /** Subscriptions for RPC streams that need to be re-established on reconnect. */
  private readonly _streamSubscriptions = new SubscriptionList();

  @trace.info()
  private get _isReadyState() {
    return this._isReady.get();
  }

  constructor(
    private readonly _config: Config | undefined,
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _echoClient: EchoClient,
    private readonly _halo: HaloProxy,
    /**
     * @internal
     */
    readonly _traceParent?: string,
  ) {
    const spacesStream = new PushStream<Space[]>();
    super(spacesStream.observable, []);
    this._spacesStream = spacesStream;
  }

  [inspect.custom](): string {
    return inspectObject(this);
  }

  get echoClient() {
    return this._echoClient;
  }

  @trace.info({ depth: null })
  toJSON(): { spaces: number | undefined } {
    return {
      spaces: this._value?.length,
    };
  }

  /**
   * @internal
   */
  @trace.span()
  async _open(): Promise<void> {
    log.trace('dxos.sdk.echo-proxy.open', Trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    this._ctx = new Context({
      onError: (error) => {
        log.catch(error);
      },
    });

    const credentialsSubscription = this._halo.credentials.subscribe(() => {
      if (this._updateAndOpenDefaultSpace()) {
        credentialsSubscription.unsubscribe();
      }
    });
    this._ctx.onDispose(() => credentialsSubscription.unsubscribe());

    // Register reconnection callback to re-establish streams.
    this._serviceProvider.onReconnect?.(async () => {
      log('reconnected, re-establishing streams');
      // Notify all existing spaces that reconnection is starting.
      // They will ignore state updates until the backend reaches READY again.
      for (const space of this._spaces) {
        (space as unknown as SpaceProxy)._notifyReconnecting();
      }

      await this._setupInvitationProxy();
      this._setupSpacesStream();
    });

    await this._setupInvitationProxy();

    // Subscribe to spaces and create proxies.
    const gotInitialUpdate = new Trigger();
    this._setupSpacesStream(gotInitialUpdate);

    // TODO(nf): implement/verify works
    // TODO(nf): trigger automatically? feedback on how many were resumed?

    await gotInitialUpdate.wait();
    log.trace('dxos.sdk.echo-proxy.open', Trace.end({ id: this._instanceId }));
  }

  /**
   * Set up the invitation proxy. Called on initial open and reconnect.
   */
  private async _setupInvitationProxy(): Promise<void> {
    await this._invitationProxy?.close();
    invariant(this._serviceProvider.services.InvitationsService, 'InvitationsService is not available.');
    this._invitationProxy = new InvitationsProxy(
      this._serviceProvider.services.InvitationsService!,
      this._serviceProvider.services.IdentityService,
      () => ({
        kind: Invitation_Kind.SPACE,
      }),
    );
    await this._invitationProxy.open();
  }

  /**
   * Set up the spaces stream. Called on initial open and reconnect.
   * @param gotInitialUpdate - Trigger to wake when first update is received (only on initial open).
   */
  private _setupSpacesStream(gotInitialUpdate?: Trigger): void {
    const isReconnect = !gotInitialUpdate;
    this._streamSubscriptions.clear();

    // On reconnect, we need to emit once after the first data arrives to notify React.
    let isFirstDataAfterReconnect = isReconnect;

    invariant(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    const spacesStream = this._serviceProvider.services.SpacesService.querySpaces(EMPTY, { timeout: RPC_TIMEOUT });
    spacesStream.subscribe((data: QuerySpacesResponse) => {
      let emitUpdate = false;
      const newSpaces = this.get() as unknown as SpaceProxy[];

      for (const space of data.spaces ?? []) {
        if (this._ctx.disposed) {
          return;
        }

        const spaceKeyDecoded = space.spaceKey ? toPublicKey(space.spaceKey) : undefined;
        let spaceProxy = spaceKeyDecoded
          ? (newSpaces.find(({ key }) => key.equals(spaceKeyDecoded)) as SpaceProxy | undefined)
          : undefined;
        if (!spaceProxy) {
          spaceProxy = new SpaceProxy(this._serviceProvider, space, this._echoClient);

          if (this._shouldOpenSpace(space)) {
            this._openSpaceAsync(spaceProxy as Space);
          }

          // Propagate space state updates to the space list observable.
          spaceProxy._stateUpdate.on(this._ctx, () => {
            this._spacesStream.next([...this.get()]);
          });

          newSpaces.push(spaceProxy);
          this._spaceCreated.emit(spaceProxy.key);

          if (this._defaultSpaceId && spaceProxy.id === this._defaultSpaceId) {
            this._defaultSpaceAvailable.next(true);
          }

          emitUpdate = true;
        }

        // Process space update in a separate task, also initializing the space if necessary.
        scheduleMicroTask(this._ctx, async () => {
          await spaceProxy!._processSpaceUpdate(space);
        });
      }

      // Force emit on first data after reconnect to notify React subscribers.
      if (isFirstDataAfterReconnect) {
        emitUpdate = true;
        isFirstDataAfterReconnect = false;
      }

      gotInitialUpdate?.wake();
      if (emitUpdate) {
        this._spacesStream.next([...newSpaces]);
      }
    });
    this._streamSubscriptions.add(() => spacesStream.close());
  }

  private _updateAndOpenDefaultSpace(): boolean {
    const defaultSpaceCredential: Credential | undefined = this._halo.queryCredentials({
      type: 'dxos.halo.credentials.DefaultSpace',
    })[0];
    const defaultSpaceAssertion = defaultSpaceCredential && getCredentialAssertion(defaultSpaceCredential);
    if (defaultSpaceAssertion?.['@type'] !== 'dxos.halo.credentials.DefaultSpace') {
      return false;
    }
    if (!SpaceId.isValid(defaultSpaceAssertion.spaceId)) {
      return false;
    }

    this._defaultSpaceId = defaultSpaceAssertion.spaceId;
    const defaultSpace = this._spaces.find((space) => space.id === defaultSpaceAssertion.spaceId);
    log('defaultSpaceKey read from a credential', {
      spaceExists: defaultSpace != null,
      spaceOpen: defaultSpace?.isOpen,
      spaceId: this._defaultSpaceId,
    });

    if (defaultSpace) {
      if (defaultSpace.state.get() === SpaceState.SPACE_CLOSED) {
        this._openSpaceAsync(defaultSpace);
      }
      this._defaultSpaceAvailable.next(true);
    }

    return true;
  }

  private _openSpaceAsync(spaceProxy: Space): void {
    void spaceProxy.open().catch((err) => log.catch(err));
  }

  private _shouldOpenSpace(space: SerializedSpace): boolean {
    if (this._ctx.disposed || space.state === SpaceState.SPACE_INACTIVE) {
      return false;
    }
    if (!this._config?.values?.runtime?.client?.lazySpaceOpen) {
      return true;
    }
    // Only open the default space if lazySpaceOpen is set.
    return space.id === this._defaultSpaceId;
  }

  async setConfig(config: IndexConfig): Promise<void> {
    await this._serviceProvider.services.QueryService?.setConfig(config, { timeout: 20_000 }); // TODO(dmaretskyi): Set global timeout instead.
  }

  /**
   * @internal
   */
  @trace.span()
  async _close(): Promise<void> {
    this._streamSubscriptions.clear();
    await this._ctx.dispose();
    await Promise.all(this.get().map((space) => (space as unknown as SpaceProxy)._destroy()));
    this._spacesStream.next([]);
    await this._invitationProxy?.close();
    this._invitationProxy = undefined;
    this._defaultSpaceAvailable.next(false);
    this._defaultSpaceId = undefined;
  }

  get isReady() {
    return this._isReady;
  }

  async waitUntilReady(): Promise<void> {
    await asyncTimeout(this._halo._waitForIdentity(), IDENTITY_WAIT_TIMEOUT);
    return new Promise((resolve) => {
      const subscription = this._isReady.subscribe((isReady) => {
        if (isReady) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  override get(): Space[];
  override get(spaceIdOrKey: SpaceId | PublicKey): Space | undefined;
  override get(spaceIdOrKey?: SpaceId | PublicKey): Space | Space[] | undefined {
    if (!spaceIdOrKey) {
      return this._value;
    }

    if (spaceIdOrKey instanceof PublicKey) {
      return this._value?.find(({ key }) => key.equals(spaceIdOrKey));
    } else {
      if (!SpaceId.isValid(spaceIdOrKey)) {
        throw new ApiError({ message: 'Invalid space id.' });
      }

      return this._value?.find(({ id }) => id === spaceIdOrKey);
    }
  }

  @trace.info()
  private get _spaces() {
    return this.get();
  }

  get default(): Space {
    if (!this._defaultSpaceId) {
      throw new ApiError({
        message: 'Default space ID not set. Is identity initialized and `spaces.waitUntilReady()` called?',
      });
    }
    const space = this.get().find((space) => space.id === this._defaultSpaceId);
    invariant(space, 'Default space is not yet available. Use `client.spaces.isReady` to wait for the default space.');
    return space;
  }

  async create(meta?: SpaceProperties): Promise<Space> {
    invariant(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.sdk.echo-proxy.create-space', Trace.begin({ id: traceId }));
    const space = await this._serviceProvider.services.SpacesService.createSpace(EMPTY, { timeout: RPC_TIMEOUT });

    const spaceKeyDecoded = space.spaceKey ? toPublicKey(space.spaceKey) : undefined;
    await this._spaceCreated.waitForCondition(() => {
      return spaceKeyDecoded ? this.get().some(({ key }) => key.equals(spaceKeyDecoded)) : false;
    });
    const spaceProxy = this._findProxy(space);

    await spaceProxy._databaseInitialized.wait({ timeout: CREATE_SPACE_TIMEOUT });
    spaceProxy.db.add(Obj.make(SpaceProperties, meta ?? {}), { placeIn: 'root-doc' });
    await spaceProxy.db.flush();
    await spaceProxy._initializationComplete.wait();

    log.trace('dxos.sdk.echo-proxy.create-space', Trace.end({ id: traceId }));
    return spaceProxy;
  }

  /**
   * @internal
   */
  async import(archive: SpaceArchive): Promise<Space> {
    invariant(this._serviceProvider.services.SpacesService, 'SpaceService is not available.');
    const { newSpaceId } = await this._serviceProvider.services.SpacesService.importSpace(
      { archive },
      { timeout: IMPORT_SPACE_TIMEOUT },
    );
    invariant(SpaceId.isValid(newSpaceId), 'Invalid space ID');
    await this._spaceCreated.waitForCondition(() => {
      return this.get().some((space) => space.id === newSpaceId);
    });

    const spaceProxy = this.get(newSpaceId) ?? failedInvariant();
    await spaceProxy.waitUntilReady();
    return spaceProxy;
  }

  join(invitation: Invitation | string) {
    if (!this._invitationProxy) {
      throw new ApiError({ message: 'Client not open.' });
    }

    log('accept invitation', invitation);
    return this._invitationProxy.join(invitation);
  }

  async joinBySpaceKey(spaceKey: PublicKey): Promise<Space> {
    const response = await this._serviceProvider.services.SpacesService!.joinBySpaceKey({
      spaceKey: encodePublicKey(spaceKey),
    });
    return this._findProxy(response.space);
  }

  // Odd way to define methods types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(query: Query.Any | Filter.Any, options?: Database.QueryOptions) {
    query = Filter.is(query) ? Query.select(query) : query;
    return this._echoClient.graph.query(query, options);
  }

  private _findProxy(space: SerializedSpace): SpaceProxy {
    const spaceKeyDecoded = space.spaceKey ? toPublicKey(space.spaceKey) : undefined;
    return (
      (this.get().find(({ key }) => spaceKeyDecoded && key.equals(spaceKeyDecoded)) as unknown as
        | SpaceProxy
        | undefined) ?? failUndefined()
    );
  }
}
