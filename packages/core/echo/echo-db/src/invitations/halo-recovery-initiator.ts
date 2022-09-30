//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { waitForEvent } from '@dxos/async';
import { WithTypeUrl } from '@dxos/codec-protobuf';
import {
  codec,
  createAuthMessage,
  createGreetingClaimMessage,
  Keyring,
  GreetingCommandPlugin,
  PartyInvitationClaimHandler,
  SecretProvider,
  SecretValidator
} from '@dxos/credentials';
import { randomBytes, verify } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { FullyConnectedTopology, NetworkManager } from '@dxos/network-manager';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';
import { ClaimResponse } from '@dxos/protocols/proto/dxos/halo/credentials/greet';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { InvitationDescriptor } from '../invitations';
import { InvalidInvitationError } from '../packlets/errors';
import { CredentialsSigner } from '../protocol';
import { greetingProtocolProvider } from './greeting-protocol-provider';
import { GreetingState } from './greeting-responder';
import { InvitationFactory } from './invitation-factory';

const log = debug('dxos:echo-db:halo-recovery-initiator');

const DEFAULT_TIMEOUT = 30000;

/**
 * Class to facilitate making a unsolicited connections to an existing HALO Party to ask for entrance.
 * If successful, regular Greeting will follow authenticated by the Identity key (usually recovered from
 * seed phrase).
 *
 * TODO(telackey): DoS mitigation
 */
export class HaloRecoveryInitiator {
  _state: GreetingState;
  _greeterPlugin?: GreetingCommandPlugin;
  _peerId?: Buffer;

  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _credentialsSigner: CredentialsSigner
  ) {
    this._state = GreetingState.INITIALIZED;
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

    // This is a temporary connection, there is no need to any special or permanent ID.
    this._peerId = randomBytes();
    log('Local PeerId:', PublicKey.stringify(this._peerId));

    const swarmKey = this._credentialsSigner.getIdentityKey().publicKey.asBuffer();

    this._greeterPlugin = new GreetingCommandPlugin(this._peerId, async () => false);

    log('Connecting');
    const peerJoinedWaiter = waitForEvent(
      this._greeterPlugin, 'peer:joined', () => !!this._greeterPlugin?.peers.length, timeout);

    await this._networkManager.joinProtocolSwarm({
      topic: PublicKey.from(swarmKey),
      peerId: PublicKey.from(this._peerId),
      protocol: greetingProtocolProvider(swarmKey, this._peerId, [this._greeterPlugin]),
      topology: new FullyConnectedTopology(),
      label: 'HALO recovery initiator'
    });

    await peerJoinedWaiter;
    log('Connected');
    this._state = GreetingState.CONNECTED;
  }

  /**
   * Executes a 'CLAIM' command for an offline invitation.  If successful, the Party member's device will begin
   * interactive Greeting, with a new invitation and swarm key which will be provided to the claimant.
   * Those will be returned in the form of an InvitationDescriptor.
   * @return {InvitationDescriptor}
   */
  async claim () {
    assert(this._state === GreetingState.CONNECTED);
    assert(this._greeterPlugin);
    assert(this._peerId);

    // Send to the first peer (any peer will do).
    const peer = this._greeterPlugin.peers[0];
    const responderPeerId = PublicKey.bufferize(peer.getSession().peerId);

    // Synthesize an "invitationID" which is the signature of both peerIds signed by our Identity key.
    const signature = this._credentialsSigner.signer.rawSign(
      Buffer.concat([this._peerId, responderPeerId]),
      this._credentialsSigner.getIdentityKey()
    );

    // We expect to receive a new swarm/rendezvousKey to use for the full Greeting process.
    const claimResponse = await this._greeterPlugin.send(responderPeerId,
      createGreetingClaimMessage(signature)) as ClaimResponse;
    const { id, rendezvousKey } = claimResponse;
    assert(id && rendezvousKey);

    await this.disconnect();
    this._state = GreetingState.SUCCEEDED;

    return new InvitationDescriptor(
      InvitationDescriptorProto.Type.INTERACTIVE,
      Buffer.from(rendezvousKey),
      Buffer.from(id),
      this._credentialsSigner.getIdentityKey().publicKey
    );
  }

  async disconnect () {
    const swarmKey = this._credentialsSigner.getIdentityKey().publicKey.asBuffer();
    await this._networkManager.leaveProtocolSwarm(PublicKey.from(swarmKey));
    this._state = GreetingState.DISCONNECTED;
  }

  async destroy () {
    await this.disconnect();
    this._greeterPlugin = undefined;
    this._state = GreetingState.DESTROYED;
    log('Destroyed');
  }

  // The secretProvider should provide an `Auth` message signed directly by the Identity key.
  createSecretProvider (): SecretProvider {
    return async (info: any) => Buffer.from(codec.encode(
      /* The signed portion of the Auth message includes the ID and authNonce provided
       * by "info". These values will be validated on the other end.
       */
      createAuthMessage(
        this._credentialsSigner.signer,
        info.id.value,
        this._credentialsSigner.getIdentityKey(),
        this._credentialsSigner.getIdentityKey(),
        undefined,
        info.authNonce.value)
    ));
  }

  static createHaloInvitationClaimHandler (
    identityKey: PublicKey,
    invitationManager: InvitationFactory
  ): (message: any, remotePeerId: Buffer, peerId: Buffer) => Promise<WithTypeUrl<ClaimResponse>> {
    const claimHandler = new PartyInvitationClaimHandler(async (invitationID: Buffer, remotePeerId: Buffer, peerId: Buffer) => {
      // The invitationtId is the signature of both peerIds, signed by the Identity key.
      const ok = verify(Buffer.concat([remotePeerId, peerId]), invitationID, identityKey.asBuffer());
      if (!ok) {
        throw new InvalidInvitationError();
      }

      /* Create a Keyring containing only our own PublicKey. Only a message signed by the matching private key,
       * or a KeyChain which traces back to that key, will be verified.
       */
      const keyring = new Keyring();
      await keyring.addPublicKey({
        publicKey: identityKey,
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

      // TODO(telackey): Configure expiration.
      return invitationManager.createInvitation({ secretValidator }, { expiration: Date.now() + 60_000 });
    });

    return claimHandler.createMessageHandler();
  }
}
