//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, MulticastObservable, PushStream, Trigger, scheduleMicroTask } from '@dxos/async';
import {
  CREATE_SPACE_TIMEOUT,
  type ClientServicesProvider,
  type Echo,
  IMPORT_SPACE_TIMEOUT,
  PropertiesType,
  type Space,
} from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { getCredentialAssertion } from '@dxos/credentials';
import { failUndefined, inspectObject } from '@dxos/debug';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { type EchoClient } from '@dxos/echo-db';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ApiError, trace as Trace } from '@dxos/protocols';
import {
  Invitation,
  type Space as SerializedSpace,
  type SpaceArchive,
  SpaceState,
} from '@dxos/protocols/proto/dxos/client/services';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { type HaloProxy } from '../halo/halo-proxy';
import { InvitationsProxy } from '../invitations';

import { AgentQuerySourceProvider } from './agent';
import { SpaceProxy } from './space-proxy';

const ENABLE_AGENT_QUERY_SOURCE = false;

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

    invariant(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    invariant(this._serviceProvider.services.InvitationsService, 'InvitationsService is not available.');
    this._invitationProxy = new InvitationsProxy(
      this._serviceProvider.services.InvitationsService,
      this._serviceProvider.services.IdentityService,
      () => ({
        kind: Invitation.Kind.SPACE,
      }),
    );
    await this._invitationProxy.open();

    // Subscribe to spaces and create proxies.

    const gotInitialUpdate = new Trigger();

    const spacesStream = this._serviceProvider.services.SpacesService.querySpaces(undefined, { timeout: RPC_TIMEOUT });
    spacesStream.subscribe((data) => {
      let emitUpdate = false;
      const newSpaces = this.get() as SpaceProxy[];

      for (const space of data.spaces ?? []) {
        if (this._ctx.disposed) {
          return;
        }

        let spaceProxy = newSpaces.find(({ key }) => key.equals(space.spaceKey)) as SpaceProxy | undefined;
        if (!spaceProxy) {
          spaceProxy = new SpaceProxy(this._serviceProvider, space, this._echoClient);

          if (this._shouldOpenSpace(space)) {
            this._openSpaceAsync(spaceProxy);
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

      gotInitialUpdate.wake();
      if (emitUpdate) {
        this._spacesStream.next([...newSpaces]);
      }
    });
    this._ctx.onDispose(() => spacesStream.close());

    if (ENABLE_AGENT_QUERY_SOURCE) {
      const subscription = this._isReady.subscribe(async (ready) => {
        if (!ready) {
          return;
        }

        const agentQuerySourceProvider = new AgentQuerySourceProvider(this.default);
        await agentQuerySourceProvider.open();
        this._echoClient.graph.registerQuerySourceProvider(agentQuerySourceProvider);
        this._ctx.onDispose(() => agentQuerySourceProvider.close());
        subscription.unsubscribe();
      });
      this._ctx.onDispose(() => subscription.unsubscribe());
    }

    // TODO(nf): implement/verify works
    // TODO(nf): trigger automatically? feedback on how many were resumed?

    await gotInitialUpdate.wait();
    log.trace('dxos.sdk.echo-proxy.open', Trace.end({ id: this._instanceId }));
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
    await this._ctx.dispose();
    await Promise.all(this.get().map((space) => (space as SpaceProxy)._destroy()));
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
        throw new ApiError('Invalid space id.');
      }

      return this._value?.find(({ id }) => id === spaceIdOrKey);
    }
  }

  @trace.info()
  private get _spaces() {
    return this.get();
  }

  get default(): Space {
    invariant(this._defaultSpaceId, 'Default space ID not set.');
    const space = this.get().find((space) => space.id === this._defaultSpaceId);
    invariant(space, 'Default space is not yet available. Use `client.spaces.isReady` to wait for the default space.');
    return space;
  }

  async create(meta?: PropertiesType): Promise<Space> {
    invariant(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.sdk.echo-proxy.create-space', Trace.begin({ id: traceId }));
    const space = await this._serviceProvider.services.SpacesService.createSpace(undefined, { timeout: RPC_TIMEOUT });

    await this._spaceCreated.waitForCondition(() => {
      return this.get().some(({ key }) => key.equals(space.spaceKey));
    });
    const spaceProxy = this._findProxy(space);

    await spaceProxy._databaseInitialized.wait({ timeout: CREATE_SPACE_TIMEOUT });
    spaceProxy.db.add(Obj.make(PropertiesType, meta ?? {}), { placeIn: 'root-doc' });
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
      throw new ApiError('Client not open.');
    }

    log('accept invitation', invitation);
    return this._invitationProxy.join(invitation);
  }

  async joinBySpaceKey(spaceKey: PublicKey): Promise<Space> {
    const response = await this._serviceProvider.services.SpacesService!.joinBySpaceKey({ spaceKey });
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
    return (this.get().find(({ key }) => key.equals(space.spaceKey)) as SpaceProxy) ?? failUndefined();
  }
}
