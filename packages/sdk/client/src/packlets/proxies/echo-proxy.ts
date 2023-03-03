//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, EventSubscriptions, Trigger, UnsubscribeCallback } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  ClientServicesProxy,
  InvitationsOptions,
  SpaceInvitationsProxy
} from '@dxos/client-services';
import { failUndefined, inspectObject, todo } from '@dxos/debug';
import { DatabaseRouter, EchoSchema } from '@dxos/echo-schema';
import { ApiError, SystemError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { ComplexMap } from '@dxos/util';

import { Properties, PropertiesProps } from '../proto';
import { HaloProxy } from './halo-proxy';
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
  private readonly _spaces = new ComplexMap<PublicKey, SpaceProxy>(PublicKey.hash);
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _spacesChanged = new Event<Space[]>();
  private readonly _spaceCreated = new Event<PublicKey>();

  // TODO(burdon): Rethink API (just db?)
  public readonly dbRouter = new DatabaseRouter();

  private _invitationProxy?: SpaceInvitationsProxy;
  private _cachedSpaces: Space[] = [];
  private _destroying = false; // TODO(burdon): Standardize enum.

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _modelFactory: ModelFactory,
    private readonly _haloProxy: HaloProxy
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
    assert(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
    assert(this._serviceProvider.services.SpaceInvitationsService, 'SpaceInvitationsService is not available.');
    this._invitationProxy = new SpaceInvitationsProxy(this._serviceProvider.services.SpaceInvitationsService);

    const gotInitialUpdate = new Trigger();
    const spacesStream = this._serviceProvider.services.SpacesService.querySpaces();
    spacesStream.subscribe(async (data) => {
      let emitUpdate = false;

      for (const space of data.spaces ?? []) {
        if (!this._spaces.has(space.spaceKey)) {
          await this._haloProxy.identityChanged.waitForCondition(() => !!this._haloProxy.identity);
          if (this._destroying) {
            return;
          }

          const spaceProxy = new SpaceProxy(this._serviceProvider, this._modelFactory, space, this.dbRouter);

          // NOTE: Must set in a map before initializing.
          // TODO(dmaretskyi): Filter out uninitialized spaces.
          this._spaces.set(spaceProxy.key, spaceProxy);
          this._spaceCreated.emit(spaceProxy.key);

          await spaceProxy.initialize();
          emitUpdate = true;
        } else {
          this._spaces.get(space.spaceKey)!._processSpaceUpdate(space);
        }
      }

      gotInitialUpdate.wake();
      if (emitUpdate) {
        this._cachedSpaces = Array.from(this._spaces.values());
        this._spacesChanged.emit(this._cachedSpaces);
      }
    });

    this._subscriptions.add(() => spacesStream.close());

    await gotInitialUpdate.wait();
  }

  async close() {
    for (const space of this._spaces.values()) {
      await space.destroy();
    }
    this._spaces.clear();

    await this._subscriptions.clear();
    this._invitationProxy = undefined;
  }

  addSchema(schema: EchoSchema) {
    this.dbRouter.addSchema(schema);
  }

  //
  // Spaces.
  //

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
    await spaceProxy.db.add(new Properties(meta));
    await spaceProxy.initialize(); // Idempotent.

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
   * Get list of all spaces.
   */
  getSpaces(): Space[] {
    return this._cachedSpaces;
  }

  /**
   * Subscribe to spaces changes.
   */
  // TODO(burdon): Subscriptions?
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
