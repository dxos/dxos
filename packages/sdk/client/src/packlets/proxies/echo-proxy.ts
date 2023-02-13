//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, EventSubscriptions, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  ClientServicesProxy,
  InvitationsOptions,
  SpaceInvitationsProxy
} from '@dxos/client-services';
import { failUndefined, inspectObject } from '@dxos/debug';
import { DocumentModel } from '@dxos/document-model';
import { ResultSet } from '@dxos/echo-db';
import { DatabaseRouter } from '@dxos/echo-schema';
import { ApiError, SystemError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { ComplexMap } from '@dxos/util';

import { HaloProxy } from './halo-proxy';
import { Space, SpaceProxy } from './space-proxy';

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Echo {
  createSpace(): Promise<Space>;
  // cloneSpace(snapshot: SpaceSnapshot): Promise<Space>;
  getSpace(spaceKey: PublicKey): Space | undefined;
  querySpaces(): ResultSet<Space>;
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;

  dbRouter: DatabaseRouter;
}

export class EchoProxy implements Echo {
  private readonly _spaces = new ComplexMap<PublicKey, SpaceProxy>(PublicKey.hash);
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _spacesChanged = new Event();
  private readonly _spacesInitialized = new Event<PublicKey>();

  public readonly dbRouter = new DatabaseRouter();

  private _invitationProxy?: SpaceInvitationsProxy;
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
    assert(this._serviceProvider.services.SpaceService, 'SpaceService is not available.');
    assert(this._serviceProvider.services.SpaceInvitationsService, 'SpaceInvitationsService is not available.');
    this._invitationProxy = new SpaceInvitationsProxy(this._serviceProvider.services.SpaceInvitationsService);

    const gotInitialUpdate = new Trigger();
    const spacesStream = this._serviceProvider.services.SpaceService.subscribeSpaces();
    spacesStream.subscribe(async (data) => {
      let emitUpdate = false;

      for (const space of data.spaces ?? []) {
        if (!this._spaces.has(space.publicKey)) {
          await this._haloProxy.profileChanged.waitForCondition(() => !!this._haloProxy.profile);
          if (this._destroying) {
            return;
          }

          const spaceProxy = new SpaceProxy(
            this._serviceProvider,
            this._modelFactory,
            space,
            this.dbRouter,
            this._haloProxy.profile!.identityKey
          );

          // NOTE: Must set in a map before initializing.
          this._spaces.set(spaceProxy.key, spaceProxy);
          await spaceProxy.initialize();
          this._spacesInitialized.emit(spaceProxy.key);

          // TODO(dmaretskyi): Replace with selection API when it has update filtering.
          // spaceProxy.database.entityUpdate.on((entity) => {
          //   if (entity.type === SPACE_ITEM_TYPE) {
          //     this._spacesChanged.emit(); // Trigger for `querySpaces()` when a space is updated.
          //   }
          // });

          emitUpdate = true;
        } else {
          this._spaces.get(space.publicKey)!._processSpaceUpdate(space);
        }
      }

      gotInitialUpdate.wake();
      if (emitUpdate) {
        this._spacesChanged.emit();
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

  //
  // Spaces.
  //

  /**
   * Creates a new space.
   */
  async createSpace(): Promise<Space> {
    assert(this._serviceProvider.services.SpaceService, 'SpaceService is not available.');
    const space = await this._serviceProvider.services.SpaceService.createSpace();

    await this._spacesInitialized.waitForCondition(() => {
      return this._spaces.has(space.publicKey);
    });
    const spaceProxy = this._spaces.get(space.publicKey) ?? failUndefined();

    await spaceProxy._databaseInitialized.wait({ timeout: 3_000 });
    await spaceProxy.initialize(); // Idempotent.
    spaceProxy.internal.db.mutate({
      objects: [
        {
          objectId: PublicKey.random().toHex(),
          genesis: { modelType: DocumentModel.meta.type }
        }
      ]
    });

    return spaceProxy;
  }

  /**
   * Clones the space from a snapshot.
   * @internal
   */
  async cloneSpace(snapshot: SpaceSnapshot): Promise<Space> {
    assert(this._serviceProvider.services.SpaceService, 'SpaceService is not available.');
    const space = await this._serviceProvider.services.SpaceService.cloneSpace(snapshot);

    const proxy = new Trigger<SpaceProxy>();
    const unsubscribe = this._spacesInitialized.on((spaceKey) => {
      if (spaceKey.equals(space.publicKey)) {
        const spaceProxy = this._spaces.get(space.publicKey)!;
        proxy.wake(spaceProxy);
      }
    });

    const spaceProxy = await proxy.wait();
    unsubscribe();
    return spaceProxy;
  }

  /**
   * Returns an individual space by its key.
   */
  getSpace(spaceKey: PublicKey): Space | undefined {
    return this._spaces.get(spaceKey);
  }

  /**
   * Query for all spaces.
   */
  querySpaces(): ResultSet<Space> {
    return new ResultSet<Space>(this._spacesChanged, () => Array.from(this._spaces.values()));
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
