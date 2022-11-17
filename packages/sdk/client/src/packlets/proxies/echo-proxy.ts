//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, EventSubscriptions, latch } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  ClientServicesProxy,
  InvitationObservable,
  InvitationsOptions,
  SpaceInvitationsProxy
} from '@dxos/client-services';
import { inspectObject } from '@dxos/debug';
import { ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
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
  cloneSpace(snapshot: SpaceSnapshot): Promise<Space>;
  getSpace(spaceKey: PublicKey): Space | undefined;
  querySpaces(): ResultSet<Space>;
  acceptInvitation(invitation: Invitation): Promise<InvitationObservable>;
}

export class EchoProxy implements Echo {
  private readonly _spaces = new ComplexMap<PublicKey, SpaceProxy>(PublicKey.hash);
  private readonly _invitationProxy = new SpaceInvitationsProxy(this._serviceProvider.services.SpaceInvitationsService);
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _spacesChanged = new Event();

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _modelFactory: ModelFactory,
    private readonly _haloProxy: HaloProxy
  ) {}

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
      throw new Error('Network Manager not available in service proxy.');
    }

    // TODO(wittjosiah): Reconcile service provider host with interface.
    return (this._serviceProvider as any).echo.networkManager;
  }

  /**
   * @internal
   */
  async _open() {
    const gotSpaces = this._spacesChanged.waitForCount(1);

    const spacesStream = this._serviceProvider.services.SpaceService.subscribeSpaces();
    spacesStream.subscribe(async (data) => {
      for (const space of data.spaces ?? []) {
        if (!this._spaces.has(space.publicKey)) {
          await this._haloProxy.profileChanged.waitForCondition(() => !!this._haloProxy.profile);

          const spaceProxy = new SpaceProxy(
            this._serviceProvider,
            this._modelFactory,
            space,
            this._haloProxy.profile!.identityKey
          );

          await spaceProxy.initialize();
          this._spaces.set(spaceProxy.key, spaceProxy);

          // TODO(dmaretskyi): Replace with selection API when it has update filtering.
          // spaceProxy.database.entityUpdate.on(entity => {
          //   if (entity.type === SPACE_ITEM_TYPE) {
          //     this._spacesChanged.emit(); // Trigger for `querySpaces()` when a space is updated.
          //   }
          // });

          // const spaceStream = this._serviceProvider.services.SpaceService.subscribeToSpace({ space_key: space.public_key });
          // spaceStream.subscribe(async ({ space }) => {
          //   if (!space) {
          //     return;
          //   }

          //   spaceProxy._processSpaceUpdate(space);
          //   this._spacesChanged.emit();
          // });

          // this._subscriptions.add(() => spaceStream.close());
        } else {
          this._spaces.get(space.publicKey)!._processSpaceUpdate(space);
        }
      }

      this._spacesChanged.emit();
    });

    this._subscriptions.add(() => spacesStream.close());

    await gotSpaces;
  }

  /**
   * @internal
   */
  async _close() {
    for (const space of this._spaces.values()) {
      await space.destroy();
    }

    await this._subscriptions.clear();
  }

  //
  // Spaces.
  //

  /**
   * Creates a new space.
   */
  async createSpace(): Promise<Space> {
    const [done, spaceReceived] = latch();

    const space = await this._serviceProvider.services.SpaceService.createSpace();
    const handler = () => {
      if (this._spaces.has(space.publicKey)) {
        spaceReceived();
      }
    };

    this._spacesChanged.on(handler);
    handler();
    await done();

    this._spacesChanged.off(handler);
    return this._spaces.get(space.publicKey)!;
  }

  /**
   * Clones the space from a snapshot.
   */
  async cloneSpace(snapshot: SpaceSnapshot): Promise<Space> {
    const [done, spaceReceived] = latch();

    const space = await this._serviceProvider.services.SpaceService.cloneSpace(snapshot);
    const handler = () => {
      if (this._spaces.has(space.publicKey)) {
        spaceReceived();
      }
    };

    this._spacesChanged.on(handler);
    handler();
    await done();

    this._spacesChanged.off(handler);
    return this._spaces.get(space.publicKey)!;
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
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): Promise<AuthenticatingInvitationObservable> {
    return new Promise<AuthenticatingInvitationObservable>((resolve, reject) => {
      const acceptedInvitation = this._invitationProxy.acceptInvitation(invitation, options);
      const unsubscribe = acceptedInvitation.subscribe({
        onConnecting: () => {
          resolve(acceptedInvitation);
          unsubscribe();
        },
        onSuccess: () => {
          unsubscribe();
        },
        onError: function (err: any): void {
          unsubscribe();
          reject(err);
        }
      });
    });
  }
}
