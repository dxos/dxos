//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, latch } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { InvitationDescriptor, PARTY_ITEM_TYPE, ResultSet } from '@dxos/echo-db';
import { PartyKey, PartySnapshot } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { ClientServiceHost } from '../client/service-host';
import { ClientServiceProvider } from '../interfaces';
import { Invitation, InvitationProxy } from './invitations';
import { PartyProxy } from './party-proxy';

export class PartyInvitation extends Invitation<PartyProxy> {
  /**
   * Wait for the invitation flow to complete and return the target party.
   */
  getParty (): Promise<PartyProxy> {
    return this.wait();
  }
}

export class EchoProxy {
  private readonly _modelFactory: ModelFactory;
  private _parties = new ComplexMap<PublicKey, PartyProxy>(key => key.toHex());
  private readonly _partiesChanged = new Event();
  private readonly _subscriptions = new SubscriptionGroup();

  constructor (
    private readonly _serviceProvider: ClientServiceProvider
  ) {
    this._modelFactory = _serviceProvider instanceof ClientServiceHost ? _serviceProvider.echo.modelFactory : new ModelFactory();

    this._modelFactory.registerModel(ObjectModel); // Register object-model by default.
  }

  get modelFactory (): ModelFactory {
    return this._modelFactory;
  }

  get networkManager () {
    if (this._serviceProvider instanceof ClientServiceHost) {
      return this._serviceProvider.echo.networkManager;
    }
    throw new Error('Network Manager not available in service proxy.');
  }

  toString () {
    return 'EchoProxy';
  }

  info () {
    return this.toString();
  }

  /**
   * @internal
   */
  _open () {
    const partiesStream = this._serviceProvider.services.PartyService.SubscribeParties();
    partiesStream.subscribe(async data => {
      for (const party of data.parties ?? []) {
        if (!this._parties.has(party.publicKey)) {
          const partyProxy = new PartyProxy(this._serviceProvider, this._modelFactory, party);
          await partyProxy.init();
          this._parties.set(partyProxy.key, partyProxy);

          // TODO(dmaretskyi): Replace with selection API when it has update filtering.
          partyProxy.database.entityUpdate.on(entity => {
            if(entity.type === PARTY_ITEM_TYPE) {
              this._partiesChanged.emit(); // Trigger for `queryParties()` when a party is updated.
            }
          });

          const partyStream = this._serviceProvider.services.PartyService.SubscribeToParty({ partyKey: party.publicKey });
          partyStream.subscribe(async ({ party }) => {
            if (!party) {
              return;
            }

            partyProxy._processPartyUpdate(party);
            this._partiesChanged.emit();
          }, () => {});
          this._subscriptions.push(() => partyStream.close());
        }
      }
      this._partiesChanged.emit();
    }, () => {});
    this._subscriptions.push(() => partiesStream.close());
  }

  /**
   * @internal
   */
  async _close () {
    for (const party of this._parties.values()) {
      await party.destroy();
    }

    this._subscriptions.unsubscribe();
  }

  //
  // Parties.
  //

  /**
   * Creates a new party.
   */
  async createParty (): Promise<PartyProxy> {
    const [partyReceivedPromise, partyReceived] = latch();

    const party = await this._serviceProvider.services.PartyService.CreateParty();

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
  async cloneParty (snapshot: PartySnapshot): Promise<PartyProxy> {
    const [partyReceivedPromise, partyReceived] = latch();

    const party = await this._serviceProvider.services.PartyService.CloneParty(snapshot);

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
  getParty (partyKey: PartyKey): PartyProxy | undefined {
    return this._parties.get(partyKey);
  }

  queryParties (): ResultSet<PartyProxy> {
    return new ResultSet(this._partiesChanged, () => Array.from(this._parties.values()));
  }

  /**
   * Joins an existing Party by invitation.
   *
   * To be used with `party.createInvitation` on the inviter side.
   */
  acceptInvitation (invitationDescriptor: InvitationDescriptor): PartyInvitation {
    const invitationProcessStream = this._serviceProvider.services.PartyService.AcceptInvitation(invitationDescriptor.toProto());
    const { authenticate, waitForFinish } = InvitationProxy.handleInvitationRedemption({
      stream: invitationProcessStream,
      invitationDescriptor,
      onAuthenticate: async (request) => {
        await this._serviceProvider.services.PartyService.AuthenticateInvitation(request);
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
