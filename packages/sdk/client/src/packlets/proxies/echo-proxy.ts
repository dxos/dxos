//
// Copyright 2021 DXOS.org
//

import { CancellableObservable, Event, EventSubscriptions, latch } from '@dxos/async';
import {
  ClientServicesProvider,
  ClientServicesProxy,
  InvitationEvents,
  SpaceInvitationsProxy
} from '@dxos/client-services';
import { ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelConstructor, ModelFactory } from '@dxos/model-factory';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { ComplexMap } from '@dxos/util';

import { Echo, Party } from './echo';
import { HaloProxy } from './halo-proxy';
import { PartyProxy } from './party-proxy';

/**
 * Client proxy to local/remote ECHO service.
 */
export class EchoProxy implements Echo {
  private readonly _parties = new ComplexMap<PublicKey, PartyProxy>(PublicKey.hash);
  private readonly _invitationProxy = new SpaceInvitationsProxy(this._serviceProvider.services.SpaceInvitationsService);
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _partiesChanged = new Event();

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _modelFactory: ModelFactory,
    private readonly _haloProxy: HaloProxy
  ) {}

  toString() {
    return `EchoProxy(${JSON.stringify(this.info)})`;
  }

  get modelFactory(): ModelFactory {
    return this._modelFactory;
  }

  get networkManager() {
    if (this._serviceProvider instanceof ClientServicesProxy) {
      throw new Error('Network Manager not available in service proxy.');
    }

    // TODO(wittjosiah): Reconcile service provider host with interface.
    return (this._serviceProvider as any).echo.networkManager;
  }

  // TODO(burdon): Client ID?
  get info() {
    return {
      parties: this._parties.size
    };
  }

  registerModel(constructor: ModelConstructor<any>): this {
    this._modelFactory.registerModel(constructor);
    return this;
  }

  /**
   * @internal
   */
  async _open() {
    const gotParties = this._partiesChanged.waitForCount(1);

    const partiesStream = this._serviceProvider.services.PartyService.subscribeParties();
    partiesStream.subscribe(async (data) => {
      for (const party of data.parties ?? []) {
        if (!this._parties.has(party.publicKey)) {
          await this._haloProxy.profileChanged.waitForCondition(() => !!this._haloProxy.profile);

          const partyProxy = new PartyProxy(
            this._serviceProvider,
            this._modelFactory,
            party,
            this._haloProxy.profile!.publicKey
          );
          await partyProxy.initialize();
          this._parties.set(partyProxy.key, partyProxy);

          // TODO(dmaretskyi): Replace with selection API when it has update filtering.
          // partyProxy.database.entityUpdate.on(entity => {
          //   if (entity.type === PARTY_ITEM_TYPE) {
          //     this._partiesChanged.emit(); // Trigger for `queryParties()` when a party is updated.
          //   }
          // });

          // const partyStream = this._serviceProvider.services.PartyService.subscribeToParty({ party_key: party.public_key });
          // partyStream.subscribe(async ({ party }) => {
          //   if (!party) {
          //     return;
          //   }

          //   partyProxy._processPartyUpdate(party);
          //   this._partiesChanged.emit();
          // });

          // this._subscriptions.add(() => partyStream.close());
        }
      }

      this._partiesChanged.emit();
    });

    this._subscriptions.add(() => partiesStream.close());

    await gotParties;
  }

  /**
   * @internal
   */
  async _close() {
    for (const party of this._parties.values()) {
      await party.destroy();
    }

    await this._subscriptions.clear();
  }

  //
  // Parties.
  //

  /**
   * Creates a new party.
   */
  async createParty(): Promise<Party> {
    const [done, partyReceived] = latch();

    const party = await this._serviceProvider.services.PartyService.createParty();
    const handler = () => {
      if (this._parties.has(party.publicKey)) {
        partyReceived();
      }
    };

    this._partiesChanged.on(handler);
    handler();
    await done();

    this._partiesChanged.off(handler);
    return this._parties.get(party.publicKey)!;
  }

  /**
   * Clones the party from a snapshot.
   */
  async cloneParty(snapshot: PartySnapshot): Promise<Party> {
    const [done, partyReceived] = latch();

    const party = await this._serviceProvider.services.PartyService.cloneParty(snapshot);
    const handler = () => {
      if (this._parties.has(party.publicKey)) {
        partyReceived();
      }
    };

    this._partiesChanged.on(handler);
    handler();
    await done();

    this._partiesChanged.off(handler);
    return this._parties.get(party.publicKey)!;
  }

  /**
   * Returns an individual party by its key.
   */
  getParty(partyKey: PublicKey): Party | undefined {
    return this._parties.get(partyKey);
  }

  /**
   * Query for all parties.
   */
  queryParties(): ResultSet<Party> {
    return new ResultSet<Party>(this._partiesChanged, () => Array.from(this._parties.values()));
  }

  /**
   * Initiates an interactive accept invitation flow.
   */
  acceptInvitation(invitation: Invitation): CancellableObservable<InvitationEvents> {
    return this._invitationProxy.acceptInvitation(invitation);
  }
}
