//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { createPartyInvitationMessage, Message as HaloMessage } from '@dxos/credentials';
import { FeedWriter } from '@dxos/echo-protocol';
import { NetworkManager } from '@dxos/network-manager';
import { PublicKey } from '@dxos/protocols';

import { PartyStateProvider } from '../pipeline';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { defaultInvitationAuthenticator, InvitationAuthenticator, InvitationOptions } from './common';
import { GreetingResponder } from './greeting-responder';
import { InvitationDescriptor, InvitationDescriptorType } from './invitation-descriptor';

/**
 * Groups together all invitation-related functionality for a single party.
 */
export class InvitationFactory {
  constructor (
    private readonly _partyProcessor: PartyStateProvider,
    // This needs to be a provider in case this is a backend for the HALO party.
    // Then the identity would be changed after this is instantiated.
    private readonly _credentialsSigner: CredentialsSigner,
    private readonly _credentialsWriter: FeedWriter<HaloMessage>,
    private readonly _networkManager: NetworkManager
  ) {}

  get isHalo () {
    // The PartyKey of the HALO is the Identity key.
    return this._credentialsSigner.getIdentityKey().publicKey.equals(this._partyProcessor.partyKey);
  }

  async createOfflineInvitation (publicKey: PublicKey) {
    assert(!this.isHalo, 'Offline invitations to HALO are not allowed.');

    const invitationMessage = createPartyInvitationMessage(
      this._credentialsSigner.signer,
      this._partyProcessor.partyKey,
      publicKey,
      this._credentialsSigner.getIdentityKey(),
      this._credentialsSigner.getDeviceSigningKeys()
    );

    await this._credentialsWriter.write(invitationMessage);

    return new InvitationDescriptor(
      InvitationDescriptorType.OFFLINE,
      this._partyProcessor.partyKey.asBuffer(),
      invitationMessage.payload.signed.payload.id
    );
  }

  /**
   * Creates an invitation for a remote peer.
   */
  async createInvitation (
    authenticationDetails: InvitationAuthenticator = defaultInvitationAuthenticator, options: InvitationOptions = {}) {
    assert(this._networkManager);
    const responder = new GreetingResponder(
      this._networkManager,
      this._partyProcessor,
      this._credentialsSigner,
      this._credentialsWriter
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
