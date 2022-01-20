//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, latch, trigger } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, throwUnhandledRejection } from '@dxos/debug';
import { InvitationDescriptor, InvitationDescriptorType, ResultSet } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { RpcClosedError } from '@dxos/rpc';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { ClientServiceHost } from '../client/service-host';
import { ClientServiceProvider } from '../interfaces';
import { InvitationState, RedeemedInvitation } from '../proto/gen/dxos/client';
import { AuthenticatedInvitation } from './invitations';
import { PartyProxy } from './party-proxy';

export class PartyInvitation extends AuthenticatedInvitation<PartyProxy> {
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
  acceptInvitation (invitationDescriptor: InvitationDescriptor): PartyInvitation {
    const [getInvitationProcess, resolveInvitationProcess] = trigger<RedeemedInvitation>();
    const [waitForParty, resolveParty] = trigger<PartyProxy>();

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
        // TODO(dmaretskyi): Should result in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
        throwUnhandledRejection(error);
      }
    });

    const authenticate = async (secret: Uint8Array) => {
      if (invitationDescriptor.type === InvitationDescriptorType.OFFLINE) {
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

    return new PartyInvitation(
      invitationDescriptor,
      waitForParty(),
      authenticate
    );
  }
}
