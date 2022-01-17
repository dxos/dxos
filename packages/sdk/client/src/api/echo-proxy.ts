//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, latch, trigger } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, raise, throwUnhandledRejection } from '@dxos/debug';
import { ECHO, InvitationDescriptor, InvitationDescriptorType, PartyNotFoundError, ResultSet } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { RpcClosedError } from '@dxos/rpc';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { ClientServiceHost } from '../client/service-host';
import { ClientServiceProvider } from '../interfaces';
import { InvitationState, RedeemedInvitation } from '../proto/gen/dxos/client';
import { Invitation, InvitationRequest } from './invitations';
import { PartyProxy } from './party-proxy';

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
   * @returns An async function to provide secret and finishing the invitation process.
   */
  acceptInvitation (invitationDescriptor: InvitationDescriptor): Invitation {
    const [getInvitationProcess, resolveInvitationProcess] = trigger<RedeemedInvitation>();
    const [waitForParty, resolveParty] = trigger<PartyProxy>();

    setImmediate(async () => {
      const invitationProcessStream = this._serviceProvider.services.PartyService.AcceptInvitation(invitationDescriptor.toProto());

      invitationProcessStream.subscribe(async process => {
        resolveInvitationProcess(process);

        if (process.state === InvitationState.SUCCESS) {
          assert(process.partyKey);
          await this._partiesChanged.waitForCondition(() => this._parties.has(process.partyKey!));

          resolveParty(this.getParty(process.partyKey) ?? failUndefined());
        } else if (process.state === InvitationState.ERROR) {
          assert(process.error);
          const error = new Error(process.error);
          // TODO(dmaretskyi): Should result in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
          throwUnhandledRejection(error);
        }
      }, error => {
        if (error && !(error instanceof RpcClosedError)) {
          // TODO(dmaretskyi): Should reuslt in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
          throwUnhandledRejection(error);
        }
      });
    });

    const authenticate = async (secret: Uint8Array) => {
      if(invitationDescriptor.type === InvitationDescriptorType.OFFLINE) {
        throw new Error('Cannot authenticate offline invitation.');
      }
      
      const invitationProcess = await getInvitationProcess();

      await this._serviceProvider.services.PartyService.AuthenticateInvitation({
        processId: invitationProcess.id,
        secret
      });
    };

    if (invitationDescriptor.secret && invitationDescriptor.type === InvitationDescriptorType.INTERACTIVE) {
      void authenticate(invitationDescriptor.secret);
    }

    return new Invitation(
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
   * 
   * @deprecated Use party.createInvitation(...).
   */
  async createInvitation (partyKey: PublicKey): Promise<InvitationRequest> {
    const party = this.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createInvitation();
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
    if (!(this._serviceProvider instanceof ClientServiceHost)) {
      throw new Error('Offline Invitations not yet implemented with remote services.');
    }
    const party = await this._serviceProvider.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createOfflineInvitation(recipientKey);
  }
}
