//
// Copyright 2021 DXOS.org
//

import { Event, latch } from '@dxos/async';
import { defaultSecretValidator } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { raise } from '@dxos/debug';
import { ECHO, InvitationAuthenticator, InvitationOptions, PartyNotFoundError, ResultSet } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { ClientServiceProvider } from '../interfaces';
import { ClientServiceHost } from '../service-host';
import { PartyProxy } from './PartyProxy';

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
    return this._serviceProvider.echo.networkManager;
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
          const partyProxy = this.createPartyProxy(party.publicKey);
          await partyProxy.open();
          this._parties.set(party.publicKey, partyProxy);
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
      await party.close();
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
   * Returns an individual party by its key.
   */
  getParty (partyKey: PartyKey): PartyProxy | undefined {
    return this._parties.get(partyKey);
  }

  private createPartyProxy (partyKey: PartyKey): PartyProxy {
    return new PartyProxy(this._serviceProvider, this._modelFactory, partyKey);
  }

  queryParties (): ResultSet<PartyProxy> {
    return new ResultSet(this._partiesChanged, () => Array.from(this._parties.values()));
  }

  async joinParty (...args: Parameters<ECHO['joinParty']>) {
    return this._serviceProvider.echo.joinParty(...args);
  }

  /**
   * Creates an invitation to a given party.
   * The Invitation flow requires the inviter and invitee to be online at the same time.
   * If the invitee is known ahead of time, `createOfflineInvitation` can be used instead.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.joinParty` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param auth.secretProvider supplies the pin code
   * @param auth.secretValidator checks the pin code validity
   * @param options.onFinish A function to be called when the invitation is closed (successfully or not).
   * @param options.expiration Date.now()-style timestamp of when this invitation should expire.
   */
  async createInvitation (partyKey: PublicKey, auth: Partial<InvitationAuthenticator>, options?: InvitationOptions) {
    const party = await this._serviceProvider.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createInvitation({
      secretValidator: auth.secretValidator ?? defaultSecretValidator,
      secretProvider: auth.secretProvider
    },
    options);
  }

  /**
   * Function to create an Offline Invitation for a recipient to a given party.
   * Offline Invitation, unlike regular invitation, does NOT require
   * the inviter and invitee to be online at the same time - hence `Offline` Invitation.
   * The invitee (recipient) needs to be known ahead of time.
   * Invitation it not valid for other users.
   *
   * To be used with `client.echo.joinParty` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param recipientKey the invitee (recipient for the invitation).
   */
  async createOfflineInvitation (partyKey: PublicKey, recipientKey: PublicKey) {
    const party = await this._serviceProvider.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createOfflineInvitation(recipientKey);
  }
}
