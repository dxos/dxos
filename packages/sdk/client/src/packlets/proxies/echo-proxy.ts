//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, scheduleTask, Trigger, UnsubscribeCallback } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined, inspectObject, todo } from '@dxos/debug';
import { DatabaseRouter, EchoSchema } from '@dxos/echo-schema';
import { ApiError, SystemError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Invitation, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { ComplexMap } from '@dxos/util';

import { ClientServicesProvider, ClientServicesProxy } from '../client';
import { AuthenticatingInvitationObservable, InvitationsOptions, SpaceInvitationsProxy } from '../invitations';
import { Properties, PropertiesProps } from '../proto';
import { Space, SpaceProxy } from './space-proxy';

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Echo {
  createSpace(): Promise<Space>;
  // cloneSpace(snapshot: SpaceSnapshot): Promise<Space>;

  getSpace(spaceKey: PublicKey): Space | undefined;
  getSpaces(): Space[];
  subscribeSpaces(callback: (spaces: Space[]) => void): UnsubscribeCallback;

  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;

  dbRouter: DatabaseRouter;
}

export class EchoProxy implements Echo {
  private _ctx!: Context;

  private readonly _spaces = new ComplexMap<PublicKey, SpaceProxy>(PublicKey.hash);
  private readonly _spacesChanged = new Event<Space[]>();
  private readonly _spaceCreated = new Event<PublicKey>();

  // TODO(burdon): Rethink API (just db?)
  public readonly dbRouter = new DatabaseRouter();

  private _invitationProxy?: SpaceInvitationsProxy;
  private _cachedSpaces: Space[] = [];

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _modelFactory: ModelFactory
  ) { }

  [inspect.custom]() {
    return inspectObject(this);
  }

  // TODO(burdon): Include deviceId.
  toJSON() {
    return {
      spaces: this._spaces.size
    };
  }

  /**
   * @deprecated
   */
  get modelFactory(): ModelFactory {
    return this._modelFactory;
  }

  /**
   * @deprecated
   */
  get networkManager() {
    if (this._serviceProvider instanceof ClientServicesProxy) {
      throw new SystemError('Network manager not available in service proxy.');
    }

    // TODO(wittjosiah): Reconcile service provider host with interface.
    return (this._serviceProvider as any).echo.networkManager;
  }

  // TODO(burdon): ???
  get opened() {
    return this._invitationProxy !== undefined;
  }

  async open() {
    this._ctx = new Context();

    assert(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    assert(this._serviceProvider.services.SpaceInvitationsService, 'SpaceInvitationsService is not available.');
    this._invitationProxy = new SpaceInvitationsProxy(this._serviceProvider.services.SpaceInvitationsService);

    // Subscribe to spaces and create proxies.
    const gotInitialUpdate = new Trigger();

    const spacesStream = this._serviceProvider.services.SpacesService.querySpaces();
    spacesStream.subscribe(async (data) => {
      if (!data.spaces || data.spaces.length === 0) {
        // If there are no spaces on startup, unblock open immediately.
        gotInitialUpdate.wake();
        return;
      }

      let emitUpdate = false;

      for (const space of data.spaces ?? []) {
        if (this._ctx.disposed) {
          return;
        }

        let spaceProxy = this._spaces.get(space.spaceKey);
        if (!spaceProxy) {
          spaceProxy = new SpaceProxy(this._serviceProvider, this._modelFactory, space, this.dbRouter);

          // NOTE: Must set in a map before initializing.
          this._spaces.set(spaceProxy.key, spaceProxy);
          this._spaceCreated.emit(spaceProxy.key);

          emitUpdate = true;
        }

        // Initialize space in a separate task.
        scheduleTask(this._ctx, async () => {
          await spaceProxy!._processSpaceUpdate(space);

          // NOTE: This is a hack to make sure we wait until all spaces are initialized before returning from open.
          // This is needed because apps don't handle spaces loading correctly.
          // TODO(dmaretskyi): Remove when apps and API are ready.
          if (data.spaces?.every((space) => space.state === SpaceState.READY)) {
            gotInitialUpdate.wake();
            this._updateSpaceList();
          }
        });
      }

      if (emitUpdate) {
        this._updateSpaceList();
      }
    });
    this._ctx.onDispose(() => spacesStream.close());

    await gotInitialUpdate.wait();
  }

  async close() {
    await this._ctx.dispose();

    // TODO(dmaretskyi): Parallelize.
    for (const space of this._spaces.values()) {
      await space._destroy();
    }
    this._spaces.clear();
    this._cachedSpaces = [];

    this._invitationProxy = undefined;
  }

  addSchema(schema: EchoSchema) {
    this.dbRouter.addSchema(schema);
  }

  //
  // Spaces.
  //

  private _updateSpaceList() {
    this._cachedSpaces = Array.from(this._spaces.values()).filter((space) => space._initialized);
    this._spacesChanged.emit(this._cachedSpaces);
  }

  /**
   * Creates a new space.
   */
  async createSpace(meta?: PropertiesProps): Promise<Space> {
    assert(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    const space = await this._serviceProvider.services.SpacesService.createSpace();

    await this._spaceCreated.waitForCondition(() => {
      return this._spaces.has(space.spaceKey);
    });
    const spaceProxy = this._spaces.get(space.spaceKey) ?? failUndefined();

    await spaceProxy._databaseInitialized.wait({ timeout: 3_000 });
    spaceProxy.db.add(new Properties(meta));
    await spaceProxy.db.flush();
    await spaceProxy._initializationComplete.wait();

    return spaceProxy;
  }

  /**
   * Clones the space from a snapshot.
   * @internal
   */
  async cloneSpace(snapshot: SpaceSnapshot): Promise<Space> {
    return todo();
    // assert(this._serviceProvider.services.SpaceService, 'SpaceService is not available.');
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

  /**
   * Returns an individual space by its key.
   */
  getSpace(spaceKey: PublicKey): Space | undefined {
    return this._spaces.get(spaceKey);
  }

  /**
   * Gets a list of all spaces.
   */
  getSpaces(): Space[] {
    // TODO(burdon): Why is this different from getSpace?
    return this._cachedSpaces;
  }

  /**
   * Subscribes to spaces changes.
   */
  // TODO(burdon): Reconcile with `space.db.query` API.
  subscribeSpaces(callback: (spaces: Space[]) => void) {
    return this._spacesChanged.on(callback);
  }

  /**
   * Initiates an interactive accept invitation flow.
   */
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions) {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    log('accept invitation', options);
    return this._invitationProxy!.acceptInvitation(invitation, options);
  }
}
