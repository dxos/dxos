//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, MulticastObservable, PushStream, Trigger, scheduleTask } from '@dxos/async';
import {
  CREATE_SPACE_TIMEOUT,
  Properties,
  defaultKey,
  type ClientServicesProvider,
  type Echo,
  type PropertiesProps,
  type Space,
} from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { failUndefined, inspectObject, todo } from '@dxos/debug';
import {
  type FilterSource,
  type Hypergraph,
  type Query,
  type TypeCollection,
  type TypedObject,
} from '@dxos/echo-schema';
import { AutomergeContext } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ModelFactory } from '@dxos/model-factory';
import { ApiError, trace as Trace } from '@dxos/protocols';
import { Invitation, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { trace } from '@dxos/tracing';

import { AgentQuerySourceProvider } from './agent-query-source-provider';
import { SpaceProxy } from './space-proxy';
import { InvitationsProxy } from '../invitations';

@trace.resource()
export class SpaceList extends MulticastObservable<Space[]> implements Echo {
  private _ctx!: Context;
  private _invitationProxy?: InvitationsProxy;
  private readonly _defaultSpaceAvailable = new PushStream<boolean>();
  private _isReady = new MulticastObservable(this._defaultSpaceAvailable.observable, false);
  private readonly _spacesStream: PushStream<Space[]>;
  private readonly _spaceCreated = new Event<PublicKey>();
  private readonly _instanceId = PublicKey.random().toHex();

  private readonly _automergeContext: AutomergeContext;

  @trace.info()
  private get _isReadyState() {
    return this._isReady.get();
  }

  constructor(
    private readonly _config: Config | undefined,
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _modelFactory: ModelFactory,
    private readonly _graph: Hypergraph,
    private readonly _getIdentityKey: () => PublicKey | undefined,
    /**
     * @internal
     */
    readonly _traceParent?: string,
  ) {
    const spacesStream = new PushStream<Space[]>();
    super(spacesStream.observable, []);
    this._spacesStream = spacesStream;
    this._automergeContext = new AutomergeContext(_serviceProvider.services.DataService, {
      spaceFragmentationEnabled: this._config?.values?.runtime?.client?.storage?.spaceFragmentation ?? false,
    });
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  @trace.info({ depth: null })
  toJSON() {
    return {
      spaces: this._value?.length,
    };
  }

  get modelFactory(): ModelFactory {
    return this._modelFactory;
  }

  /**
   * @internal
   */
  @trace.span()
  async _open() {
    log.trace('dxos.sdk.echo-proxy.open', Trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    this._ctx = new Context({
      onError: (error) => {
        log.catch(error);
      },
    });

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

    const spacesStream = this._serviceProvider.services.SpacesService.querySpaces();
    spacesStream.subscribe(async (data) => {
      let emitUpdate = false;
      const newSpaces = this.get() as SpaceProxy[];

      for (const space of data.spaces ?? []) {
        if (this._ctx.disposed) {
          return;
        }

        let spaceProxy = newSpaces.find(({ key }) => key.equals(space.spaceKey)) as SpaceProxy | undefined;
        if (!spaceProxy) {
          spaceProxy = new SpaceProxy(
            this._serviceProvider,
            this._modelFactory,
            space,
            this._graph,
            this._automergeContext,
          );

          // Propagate space state updates to the space list observable.
          spaceProxy._stateUpdate.on(this._ctx, () => {
            this._spacesStream.next([...this.get()]);
            if (
              spaceProxy?.state.get() === SpaceState.READY &&
              spaceProxy?.properties[defaultKey] === this._getIdentityKey()?.toHex()
            ) {
              this._defaultSpaceAvailable.next(true);
              this._defaultSpaceAvailable.complete();
            }
          });

          newSpaces.push(spaceProxy);
          this._spaceCreated.emit(spaceProxy.key);

          emitUpdate = true;
        }

        // Process space update in a separate task, also initializing the space if necessary.
        scheduleTask(this._ctx, async () => {
          await spaceProxy!._processSpaceUpdate(space);
        });
      }

      gotInitialUpdate.wake();
      if (emitUpdate) {
        this._spacesStream.next([...newSpaces]);
      }
    });
    this._ctx.onDispose(() => spacesStream.close());

    const subscription = this._isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }

      const agentQuerySourceProvider = new AgentQuerySourceProvider(this.default);
      await agentQuerySourceProvider.open();
      this._graph.registerQuerySourceProvider(agentQuerySourceProvider);
      this._ctx.onDispose(() => agentQuerySourceProvider.close());
    });
    this._ctx.onDispose(() => subscription.unsubscribe());

    // TODO(nf): implement/verify works
    // TODO(nf): trigger automatically? feedback on how many were resumed?
    await this._invitationProxy.resumePersistentInvitations();

    await gotInitialUpdate.wait();
    log.trace('dxos.sdk.echo-proxy.open', Trace.end({ id: this._instanceId }));
  }

  /**
   * @internal
   */
  @trace.span()
  async _close() {
    await this._ctx.dispose();
    await this._automergeContext.close();
    await Promise.all(this.get().map((space) => (space as SpaceProxy)._destroy()));
    this._spacesStream.next([]);
    this._isReady = new MulticastObservable(this._defaultSpaceAvailable.observable, false);

    await this._invitationProxy?.close();
    this._invitationProxy = undefined;
  }

  get isReady() {
    return this._isReady;
  }

  override get(): Space[];
  override get(spaceKey: PublicKey): Space | undefined;
  override get(spaceKey?: PublicKey) {
    if (!spaceKey) {
      return this._value;
    }

    return this._value?.find(({ key }) => key.equals(spaceKey));
  }

  @trace.info()
  private get _spaces() {
    return this.get();
  }

  @trace.info()
  get default(): Space {
    const identityKey = this._getIdentityKey();
    invariant(identityKey, 'Identity must be set.');
    const space = this.get().find((space) => space.properties[defaultKey] === identityKey.toHex());
    invariant(space, 'Default space is not yet available. Use `client.spaces.isReady` to wait for the default space.');
    return space;
  }

  async create(meta?: PropertiesProps): Promise<Space> {
    invariant(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.sdk.echo-proxy.create-space', Trace.begin({ id: traceId }));
    const space = await this._serviceProvider.services.SpacesService.createSpace();

    await this._spaceCreated.waitForCondition(() => {
      return this.get().some(({ key }) => key.equals(space.spaceKey));
    });
    const spaceProxy = (this.get().find(({ key }) => key.equals(space.spaceKey)) as SpaceProxy) ?? failUndefined();

    await spaceProxy._databaseInitialized.wait({ timeout: CREATE_SPACE_TIMEOUT });
    spaceProxy.db.add(new Properties(meta));
    await spaceProxy.db.flush();
    await spaceProxy._initializationComplete.wait();

    log.trace('dxos.sdk.echo-proxy.create-space', Trace.end({ id: traceId }));
    return spaceProxy;
  }

  /**
   * @internal
   */
  async clone(snapshot: SpaceSnapshot): Promise<Space> {
    return todo();
    // invariant(this._serviceProvider.services.SpaceService, 'SpaceService is not available.');
    // const space = await this._serviceProvider.services.SpaceService.cloneSpace(snapshot);

    // const proxy = new Trigger<SpaceProxy>();
    // const unsubscribe = this._spaceCreated.on((spaceKey) => {
    //   if (spaceKey.equals(space.publicKey)) {
    //     const spaceProxy = this._spaces.get(space.publicKey)!;
    //     proxy.wake(spaceProxy);
    //   }
    // });

    // const spaceProxy = await proxy.wait();
    // unsubscribe();
    // return spaceProxy;
  }

  join(invitation: Invitation | string) {
    if (!this._invitationProxy) {
      throw new ApiError('Client not open.');
    }

    log('accept invitation', invitation);
    return this._invitationProxy.join(invitation);
  }

  /**
   * @deprecated use client.addSchema
   */
  addSchema(schema: TypeCollection) {
    this._graph.addTypes(schema);
  }

  /**
   * Query all spaces.
   * @param filter
   * @param options
   */
  query<T extends TypedObject>(filter?: FilterSource<T>, options?: QueryOptions): Query<T> {
    return this._graph.query(filter, options);
  }
}
