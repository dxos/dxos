//
// Copyright 2021 DXOS.org
//

import { Event, latch, trigger } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, raise } from '@dxos/debug';
import { ECHO, InvitationDescriptor, InvitationOptions, PartyNotFoundError, ResultSet } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';
import assert from 'assert';
import { RedeemingInvitation } from '.';
import { ClientServiceProvider } from '../interfaces';
import { InvitationProcess, Party } from '../proto/gen/dxos/client';
import { ClientServiceHost } from '../service-host';
import { decodeInvitation, encodeInvitation } from '../util';
import { InvitationRequest } from './invitations';
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
          const partyProxy = await this.createPartyProxy(party);
          this._parties.set(partyProxy.key, partyProxy);

          const partyStream = this._serviceProvider.services.PartyService.SubscribeParty({ partyKey: party.publicKey });
          partyStream.subscribe(async ({ party }) => {
            if (!party) {
              return;
            }

            const partyProxy = await this.createPartyProxy(party);
            this._parties.set(partyProxy.key, partyProxy);
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
   * Returns an individual party by its key.
   */
  getParty (partyKey: PartyKey): PartyProxy | undefined {
    return this._parties.get(partyKey);
  }

  private async createPartyProxy (party: Party): Promise<PartyProxy> {
    const proxy = new PartyProxy(this._serviceProvider, this._modelFactory, party);
    await proxy.init();
    return proxy;
  }

  queryParties (): ResultSet<PartyProxy> {
    return new ResultSet(this._partiesChanged, () => Array.from(this._parties.values()));
  }

  /**
   * @deprecated Use acceptInvitation instead.
   */
  async joinParty (...args: Parameters<ECHO['joinParty']>) {
    return this._serviceProvider.echo.joinParty(...args);
  }

  /**
   * Joins an existing Party by invitation.
   * @returns An async function to provide secret and finishing the invitation process.
   */
  acceptInvitation (invitationDescriptor: InvitationDescriptor): RedeemingInvitation {
    const [getInvitationProcess, resolveInvitationProcess] = trigger<InvitationProcess>();
    const [waitForParty, resolveParty] = trigger<PartyProxy>();

    setImmediate(async () => {
      const invitationProcess = await this._serviceProvider.services.PartyService.AcceptInvitation({
        invitationCode: encodeInvitation(invitationDescriptor)
      });

      resolveInvitationProcess(invitationProcess);
    });

    const authenticate = async (secret: Buffer) => {
      const invitationProcess = await getInvitationProcess();

      const { partyKey } = await this._serviceProvider.services.PartyService.AuthenticateInvitation({
        process: invitationProcess,
        secret: secret.toString()
      });
      assert(partyKey);
      await this._partiesChanged.waitForCondition(() => this._parties.has(partyKey));

      resolveParty(this.getParty(partyKey) ?? failUndefined());
    };

    if (invitationDescriptor.secret) {
      authenticate(invitationDescriptor.secret);
    }

    return new RedeemingInvitation(
      waitForParty(),
      authenticate
    );
  }

  /**
   * Creates an invitation to a given party.
   * The Invitation flow requires the inviter and invitee to be online at the same time.
   * If the invitee is known ahead of time, `createOfflineInvitation` can be used instead.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.acceptInvitation` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   */
  async createInvitation (partyKey: PublicKey): Promise<InvitationRequest> {
    const stream = this._serviceProvider.services.PartyService.CreateInvitation({ publicKey: partyKey });
    return new Promise((resolve, reject) => {
      const connected = new Event();
      const finished = new Event();
      const error = new Event<Error>();

      let hasInitiated = false; let hasConnected = false;

      stream.subscribe(invitationMsg => {
        if (!hasInitiated) {
          hasInitiated = true;
          const descriptor = decodeInvitation(invitationMsg.invitationCode!);
          descriptor.secret = invitationMsg.secret ? Buffer.from(invitationMsg.secret) : undefined;
          resolve(new InvitationRequest(descriptor, connected, finished, error));
        }

        if (invitationMsg.connected && !hasConnected) {
          hasConnected = true;
          connected.emit();
        }

        if (invitationMsg.finished) {
          finished.emit();
          stream.close();
        }

        if (invitationMsg.error) {
          error.emit(new Error(invitationMsg.error));
        }
      }, error => {
        if (error) {
          console.error(error);
          reject(error);
          // TODO(rzadp): Handle retry.
        }
      });
    });
  }

  /**
   * Function to create an Offline Invitation for a recipient to a given party.
   * Offline Invitation, unlike regular invitation, does NOT require
   * the inviter and invitee to be online at the same time - hence `Offline` Invitation.
   * The invitee (recipient) needs to be known ahead of time.
   * Invitation it not valid for other users.
   *
   * To be used with `client.echo.acceptInvitation` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param recipientKey the invitee (recipient for the invitation).
   */
  async createOfflineInvitation (partyKey: PublicKey, recipientKey: PublicKey) {
    const party = await this._serviceProvider.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createOfflineInvitation(recipientKey);
  }
}
