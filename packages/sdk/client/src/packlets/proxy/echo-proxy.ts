//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event, latch } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { InvitationDescriptor, PARTY_ITEM_TYPE, ResultSet } from '@dxos/echo-db';
import { PartyKey, PartySnapshot } from '@dxos/echo-protocol';
import { ModelConstructor, ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { ClientServiceProvider, Echo, Party, PartyInvitation } from '../api';
import { HaloProxy } from './halo-proxy';
import { InvitationProxy } from './invitation-proxy';
import { PartyProxy } from './party-proxy';
import { ClientServiceProxy } from './service-proxy';

/**
 * Client proxy to local/remote ECHO service.
 */
export class EchoProxy implements Echo {
  private readonly _parties = new ComplexMap<PublicKey, PartyProxy>(key => key.toHex());
  private readonly _partiesChanged = new Event();
  private readonly _subscriptions = new SubscriptionGroup();
  private readonly _modelFactory: ModelFactory;

  constructor (
    private readonly _serviceProvider: ClientServiceProvider,
    private readonly _haloProxy: HaloProxy
  ) {
    // TODO(wittjosiah): Reconcile service provider host with interface.
    this._modelFactory = _serviceProvider instanceof ClientServiceProxy
      ? new ModelFactory() : (_serviceProvider as any).echo.modelFactory;

    this._modelFactory.registerModel(ObjectModel); // Register object-model by default.
  }

  toString () {
    return `EchoProxy(${JSON.stringify(this.info)})`;
  }

  get modelFactory (): ModelFactory {
    return this._modelFactory;
  }

  get networkManager () {
    if (this._serviceProvider instanceof ClientServiceProxy) {
      throw new Error('Network Manager not available in service proxy.');
    }

    // TODO(wittjosiah): Reconcile service provider host with interface.
    return (this._serviceProvider as any).echo.networkManager;
  }

  // TODO(burdon): Client ID?
  get info () {
    return {
      parties: this._parties.size
    };
  }

  registerModel (constructor: ModelConstructor<any>): this {
    this._modelFactory.registerModel(constructor);
    return this;
  }

  /**
   * @internal
   */
  async _open () {
    const gotParties = this._partiesChanged.waitForCount(1);

    const partiesStream = this._serviceProvider.services.PartyService.subscribeParties();
    partiesStream.subscribe(async data => {
      for (const party of data.parties ?? []) {
        if (!this._parties.has(party.publicKey)) {
          await this._haloProxy.profileChanged.waitForCondition(() => !!this._haloProxy.profile);

          const partyProxy = new PartyProxy(this._serviceProvider, this._modelFactory, party, this._haloProxy.profile!.publicKey);
          await partyProxy.initialize();
          this._parties.set(partyProxy.key, partyProxy);

          // TODO(dmaretskyi): Replace with selection API when it has update filtering.
          partyProxy.database.entityUpdate.on(entity => {
            if (entity.type === PARTY_ITEM_TYPE) {
              this._partiesChanged.emit(); // Trigger for `queryParties()` when a party is updated.
            }
          });

          const partyStream = this._serviceProvider.services.PartyService.subscribeToParty({ partyKey: party.publicKey });
          partyStream.subscribe(async ({ party }) => {
            if (!party) {
              return;
            }

            partyProxy._processPartyUpdate(party);
            this._partiesChanged.emit();
          });

          this._subscriptions.push(() => partyStream.close());
        }
      }

      this._partiesChanged.emit();
    });

    this._subscriptions.push(() => partiesStream.close());

    await gotParties;
  }

  /**
   * @internal
   */
  async _close () {
    for (const party of this._parties.values()) {
      await party.destroy();
    }

    await this._subscriptions.unsubscribe();
  }

  //
  // Parties.
  //

  /**
   * Creates a new party.
   */
  async createParty (): Promise<Party> {
    const [partyReceivedPromise, partyReceived] = latch();

    const party = await this._serviceProvider.services.PartyService.createParty();

    const handler = () => {
      if (this._parties.has(party.publicKey)) {
        partyReceived();
      }
    };

    this._partiesChanged.on(handler);
    handler();

    await partyReceivedPromise;
    this._partiesChanged.off(handler);

    return this._parties.get(party.publicKey)!;
  }

  /**
   * Clones the party from a snapshot.
   */
  async cloneParty (snapshot: PartySnapshot): Promise<Party> {
    const [partyReceivedPromise, partyReceived] = latch();

    const party = await this._serviceProvider.services.PartyService.cloneParty(snapshot);

    const handler = () => {
      if (this._parties.has(party.publicKey)) {
        partyReceived();
      }
    };

    this._partiesChanged.on(handler);
    handler();

    await partyReceivedPromise;
    this._partiesChanged.off(handler);

    return this._parties.get(party.publicKey)!;
  }

  /**
   * Returns an individual party by its key.
   */
  getParty (partyKey: PartyKey): Party | undefined {
    return this._parties.get(partyKey);
  }

  /**
   *
   */
  queryParties (): ResultSet<Party> {
    return new ResultSet<Party>(this._partiesChanged, () => Array.from(this._parties.values()));
  }

  /**
   * Joins an existing Party by invitation.
   *
   * To be used with `party.createInvitation` on the inviter side.
   */
  acceptInvitation (invitationDescriptor: InvitationDescriptor): PartyInvitation {
    const invitationProcessStream = this._serviceProvider.services.PartyService.acceptInvitation(
      invitationDescriptor.toProto());
    const { authenticate, waitForFinish } = InvitationProxy.handleInvitationRedemption({
      stream: invitationProcessStream,
      invitationDescriptor,
      onAuthenticate: async (request) => {
        await this._serviceProvider.services.PartyService.authenticateInvitation(request);
      }
    });

    const waitForParty = async () => {
      const process = await waitForFinish();
      assert(process.partyKey);
      await this._partiesChanged.waitForCondition(() => this._parties.has(process.partyKey!));
      return this.getParty(process.partyKey) ?? failUndefined();
    };

    return new PartyInvitation(
      invitationDescriptor,
      waitForParty(),
      authenticate
    );
  }
}
