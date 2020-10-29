//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { waitForEvent, noop } from '@dxos/async';
import {
  Authenticator,
  ClaimResponse,
  Keyring,
  KeyType,
  GreetingCommandPlugin,
  PartyInvitationClaimHandler,
  createGreetingClaimMessage
} from '@dxos/credentials';
import { keyToString, randomBytes } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';

import { IdentityManager } from '../parties';
import { SecretValidator } from './common';
import { greetingProtocolProvider } from './greeting-protocol-provider';
import { GreetingState } from './greeting-responder';
import { InvitationDescriptor, InvitationDescriptorType } from './invitation-descriptor';

const log = debug('dxos:echo:invitations:halo-recovery-initiator');

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

  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _identityManager: IdentityManager
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
    const localPeerId = randomBytes();
    log('Local PeerId:', keyToString(localPeerId));

    const swarmKey = this._identityManager.identityKey.publicKey;

    this._greeterPlugin = new GreetingCommandPlugin(localPeerId, noop);

    log('Connecting');
    const peerJoinedWaiter = waitForEvent(this._greeterPlugin, 'peer:joined',
      () => this._greeterPlugin?.peers.length, timeout);

    await this._networkManager.joinProtocolSwarm(swarmKey,
      greetingProtocolProvider(swarmKey, localPeerId, [this._greeterPlugin]));

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

    // Send to the first peer (any peer will do).
    const peer = this._greeterPlugin.peers[0];
    const { peerId: responderPeerId } = peer.getSession();

    // We expect to receive a new swarm/rendezvousKey to use for the full Greeting process.
    const claimResponse = await this._greeterPlugin.send(responderPeerId,
      createGreetingClaimMessage(this._identityManager.identityKey.publicKey)) as ClaimResponse;
    const { id, rendezvousKey } = claimResponse;
    assert(id && rendezvousKey);

    await this.disconnect();
    this._state = GreetingState.SUCCEEDED;

    return new InvitationDescriptor(
      InvitationDescriptorType.INTERACTIVE,
      Buffer.from(rendezvousKey),
      Buffer.from(id),
      this._identityManager.identityKey.publicKey
    );
  }

  async disconnect () {
    const swarmKey = this._identityManager.identityKey.publicKey;
    await this._networkManager.leaveProtocolSwarm(swarmKey);
    this._state = GreetingState.DISCONNECTED;
  }

  async destroy () {
    await this.disconnect();
    this._greeterPlugin = undefined;
    this._state = GreetingState.DESTROYED;
    log('Destroyed');
  }

  static createHaloInvitationClaimHandler (identityManager: IdentityManager) {
    const claimHandler = new PartyInvitationClaimHandler(async () => {
      assert(identityManager.halo, 'HALO is required');
      // Create a Keyring containing only our own PublicKey. Only a message signed by the matching private key,
      // or a KeyChain which traces back to that key, will be verified.
      const keyring = new Keyring();
      await keyring.addPublicKey({
        publicKey: identityManager.identityKey.publicKey,
        type: KeyType.IDENTITY,
        trusted: true,
        own: false
      });

      const secretValidator: SecretValidator = async (invitation, secret) => {
        const { payload: authMessage } = Authenticator.decodePayload(secret);

        return keyring.verify(authMessage) &&
          Buffer.from(invitation.id, 'hex').equals(authMessage.signed.payload.partyKey) &&
          invitation.authNonce.equals(authMessage.signed.nonce);
      };

      // TODO(telackey): Configure expiration?
      return identityManager.halo.createInvitation({ secretValidator }, { expiration: Date.now() + 60000 });
    });

    return claimHandler.createMessageHandler();
  }
}
