//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { waitForEvent } from '@dxos/async';
import {
  codec,
  createAuthMessage,
  createGreetingClaimMessage,
  Keyring,
  GreetingCommandPlugin,
  PartyInvitationClaimHandler,
  SecretInfo,
  SecretProvider,
  SecretValidator
} from '@dxos/credentials';
import { randomBytes } from '@dxos/crypto';
import { FullyConnectedTopology, NetworkManager } from '@dxos/network-manager';
import { PublicKey } from '@dxos/protocols';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';
import { ClaimResponse } from '@dxos/protocols/proto/dxos/halo/credentials/greet';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { InvitationDescriptorWrapper } from '../invitations';
import { InvalidInvitationError } from '../packlets/errors';
import { CredentialsSigner } from '../protocol';
import { greetingProtocolProvider } from './greeting-protocol-provider';
import { GreetingState } from './greeting-responder';
import { InvitationFactory } from './invitation-factory';

const log = debug('dxos:party-manager:party-invitation-claimer');

const DEFAULT_TIMEOUT = 30000;

/**
 * Class to facilitate making an unauthenticated connection to an existing Party in order to claim an
 * offline invitation. If successful, the regular interactive Greeting flow will follow.
 */
export class OfflineInvitationClaimer {
  _greeterPlugin?: GreetingCommandPlugin;
  _state = GreetingState.INITIALIZED;

  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _invitationDescriptor: InvitationDescriptorWrapper
  ) {
    assert(InvitationDescriptorProto.Type.OFFLINE === _invitationDescriptor.type);
  }

  get state () {
    return this._state;
  }

  /**
   * Initiate a connection to some Party member node.
   * @param {number} timeout Connection timeout (ms).
   */
  async connect (timeout = DEFAULT_TIMEOUT) {
    assert(this._state === GreetingState.INITIALIZED);

    const { swarmKey } = this._invitationDescriptor;
    assert(swarmKey, 'swarmKey is required');

    // This is a temporary connection, there is no need to any special or permanent ID.
    const localPeerId = randomBytes();
    log('Local PeerId:', PublicKey.stringify(localPeerId));

    this._greeterPlugin = new GreetingCommandPlugin(localPeerId, async () => false);

    log('Connecting');
    const peerJoinedWaiter = waitForEvent(
      this._greeterPlugin, 'peer:joined', () => !!this._greeterPlugin?.peers.length, timeout);

    await this._networkManager.joinProtocolSwarm({
      topic: PublicKey.from(swarmKey),
      protocol: greetingProtocolProvider(swarmKey, localPeerId, [this._greeterPlugin]),
      peerId: PublicKey.from(localPeerId),
      topology: new FullyConnectedTopology(),
      label: 'Offline invitation claimer'
    });

    await peerJoinedWaiter;
    log('Connected');
    this._state = GreetingState.CONNECTED;
  }

  /**
   * Executes a 'CLAIM' command for an offline invitation.  If successful, the Party member's device will begin
   * interactive Greeting, with a new invitation and swarm key which will be provided to the claimant.
   * Those will be returned in the form of an InvitationDescriptor.
   * @return {InvitationDescriptorWrapper}
   */
  async claim () {
    assert(this._state === GreetingState.CONNECTED);
    assert(this._greeterPlugin);

    const { invitation: invitationID } = this._invitationDescriptor;

    // Send to the first peer (any peer will do).
    const responderPeerId = PublicKey.bufferize(this._greeterPlugin.peers[0].getSession().peerId);

    // We expect to receive a new swarm/rendezvousKey to use for the full Greeting process.
    const claimResponse = await this._greeterPlugin.send(
      responderPeerId,
      createGreetingClaimMessage(Buffer.from(invitationID))
    ) as ClaimResponse;
    const { id, rendezvousKey } = claimResponse;
    assert(id && rendezvousKey);

    await this.disconnect();
    this._state = GreetingState.SUCCEEDED;

    return new InvitationDescriptorWrapper(
      InvitationDescriptorProto.Type.INTERACTIVE, Buffer.from(rendezvousKey), Buffer.from(id));
  }

  async disconnect () {
    const { swarmKey } = this._invitationDescriptor;
    await this._networkManager.leaveProtocolSwarm(PublicKey.from(swarmKey));
    this._state = GreetingState.DISCONNECTED;
  }

  async destroy () {
    await this.disconnect();
    this._greeterPlugin = undefined;
    this._state = GreetingState.DESTROYED;
    log('Destroyed');
  }

  /**
   * Create a function for handling PartyInvitation claims on the indicated Party. This is used by members
   * of the Party for responding to attempts to claim an Invitation which has been written to the Party.
   * @param {InvitationFactory} invitationManager
   */
  static createOfflineInvitationClaimHandler (invitationManager: InvitationFactory) {
    const claimHandler = new PartyInvitationClaimHandler(async (invitationID: Buffer) => {
      const invitationMessage = invitationManager.getOfflineInvitation(invitationID);
      if (!invitationMessage) {
        throw new InvalidInvitationError();
      }

      // The Party will have validated the Invitation already, so we only need to extract the bits we need.
      const { inviteeKey } = invitationMessage.signed.payload;

      /* Create a Keyring containing only the PublicKey of the contact we invited. Only a message signed by
       * by the matching private key, or a KeyChain which traces back to that key, will be verified.
       */
      const keyring = new Keyring();
      await keyring.addPublicKey({
        publicKey: inviteeKey,
        type: KeyType.IDENTITY,
        trusted: true,
        own: false
      });

      const secretValidator: SecretValidator = async (invitation, secret) => {
        const { payload: authMessage } = codec.decode(secret);

        return keyring.verify(<unknown>authMessage as SignedMessage) &&
          authMessage.signed.payload.partyKey.equals(invitation.id) &&
          invitation.authNonce.equals(authMessage.signed.nonce);
      };

      return invitationManager.createInvitation({ secretValidator }, { expiration: Date.now() + 60000 });
    });

    return claimHandler.createMessageHandler();
  }

  // The secretProvider should provide an `Auth` message signed directly by the Identity key.
  static createSecretProvider (credentials: CredentialsSigner): SecretProvider {
    return async (info?: SecretInfo) => Buffer.from(codec.encode(
      /* The signed portion of the Auth message includes the ID and authNonce provided
         * by the `info` object. These values will be validated on the other end.
         */
      createAuthMessage(
        credentials.signer,
          info!.id.value,
          credentials.getIdentityKey(),
          credentials.getDeviceSigningKeys(),
          undefined,
          info!.authNonce.value)
    ));
  }
}
