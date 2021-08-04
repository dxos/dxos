//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { createPartyInvitationMessage } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';

import { IdentityProvider } from '../halo';
import { PartyProcessor } from '../parties';
import { InvitationAuthenticator, InvitationOptions } from './common';
import { GreetingResponder } from './greeting-responder';
import { InvitationDescriptor, InvitationDescriptorType } from './invitation-descriptor';

/**
 * Groups together all invitation-related functionality for a single party.
 */
export class InvitationManager {
  constructor (
    private readonly _partyProcessor: PartyProcessor,
    // This needs to be a provider in case this is a backend for the HALO party.
    // Then the identity would be changed after this is instantiated.
    private readonly _identityProvider: IdentityProvider,
    private readonly _networkManager: NetworkManager
  ) {}

  private get _identity () {
    return this._identityProvider();
  }

  get isHalo () {
    // The PartyKey of the HALO is the Identity key.
    assert(this._identity.identityKey, 'No identity key');
    return this._identity.identityKey.publicKey.equals(this._partyProcessor.partyKey);
  }

  async createOfflineInvitation (publicKey: PublicKey) {
    assert(!this.isHalo, 'Offline invitations to HALO are not allowed.');
    assert(this._identity.identityKey, 'Identity key is required.');
    assert(this._identity.deviceKeyChain, 'Device keychain is required.');

    const invitationMessage = createPartyInvitationMessage(
      this._identity.signer,
      this._partyProcessor.partyKey,
      publicKey,
      this._identity.identityKey,
      this._identity.deviceKeyChain
    );
    await this._partyProcessor.writeHaloMessage(invitationMessage);

    return new InvitationDescriptor(
      InvitationDescriptorType.OFFLINE_KEY,
      this._partyProcessor.partyKey.asBuffer(),
      invitationMessage.payload.signed.payload.id
    );
  }

  /**
   * Creates an invitation for a remote peer.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options: InvitationOptions = {}) {
    assert(this._networkManager);

    const responder = new GreetingResponder(
      this._networkManager,
      this._identity,
      this._partyProcessor
    );

    const { secretValidator, secretProvider } = authenticationDetails;
    const { onFinish, expiration } = options;

    const swarmKey = await responder.start();
    const invitation = await responder.invite(secretValidator, secretProvider, onFinish, expiration);

    return new InvitationDescriptor(
      InvitationDescriptorType.INTERACTIVE,
      swarmKey,
      invitation,
      this.isHalo ? this._partyProcessor.partyKey : undefined
    );
  }

  getOfflineInvitation (invitationId: Buffer) {
    return this._partyProcessor.getOfflineInvitation(invitationId);
  }
}
