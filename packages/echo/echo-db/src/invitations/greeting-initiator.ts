//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { waitForEvent } from '@dxos/async';
import {
  ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT,
  createEnvelopeMessage,
  createGreetingBeginMessage,
  createGreetingFinishMessage,
  createGreetingHandshakeMessage,
  createGreetingNotarizeMessage,
  createKeyAdmitMessage,
  wrapMessage,
  Greeter,
  GreetingCommandPlugin,
  Message,
  SecretProvider,
  WithTypeUrl,
  SignedMessage,
  NotarizeResponse
} from '@dxos/credentials';
import { keyToString, PublicKey } from '@dxos/crypto';
import { FullyConnectedTopology, NetworkManager } from '@dxos/network-manager';

import { CredentialsSigner } from '../protocol/credentials-signer';
import { greetingProtocolProvider } from './greeting-protocol-provider';
import { GreetingState } from './greeting-responder';
import { InvitationDescriptor, InvitationDescriptorType } from './invitation-descriptor';

const log = debug('dxos:echo-db:greeting-initiator');

const DEFAULT_TIMEOUT = 30_000;

export interface InvitationResult {
  partyKey: PublicKey;
  genesisFeedKey: PublicKey
}

/**
 * Attempts to connect to a greeting responder to 'redeem' an invitation, potentially with some out-of-band
 * authentication check, in order to be admitted to a Party.
 */
export class GreetingInitiator {
  private _greeterPlugin?: GreetingCommandPlugin;

  // TODO(dboreham): Can we use the same states as the responder?
  private _state: GreetingState = GreetingState.INITIALIZED;

  /**
   * @param _networkManager
   * @param _invitationDescriptor
   * @param _getMessagesToNotarize
   *  Returns a list of credential messages that the inviter will be asked to write into the control feed.
   */
  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _invitationDescriptor: InvitationDescriptor,
    private readonly _getMessagesToNotarize: (partyKey: PublicKey, nonce: Uint8Array) => Promise<Message[]>
  ) {
    assert(InvitationDescriptorType.INTERACTIVE === this._invitationDescriptor.type);
  }

  get state () {
    return this._state;
  }

  /**
   * Initiate a connection to a greeting responder node.
   * @param {number} timeout Connection timeout (ms).
   */
  async connect (timeout = DEFAULT_TIMEOUT) {
    assert(this._state === GreetingState.INITIALIZED);

    // TODO(telackey): Clarify what the following comment means.
    // TODO(telackey): We don't have the descriptor yet, but it must include at least this.
    const { swarmKey, invitation } = this._invitationDescriptor;

    /* Due to limitations in @dxos/protocol and hypercore-protocol, a requester in a request/response
     * interaction with a responder must know the responder's peer id. Therefore we communicate its peer
     * id in the invitation, as the greet swarm key. That is: greet swarm key, which is a unique key to serve
     * its purpose of uniquely identifying each greeter, is by convention also used as the peer id by the greeter
     * and so can be used here as the responder peer id in the greeting interaction.
     */
    const responderPeerId = Buffer.from(swarmKey);

    // Use the invitation ID as our peerId.
    // This is due to a bug in the protocol where the invitation id is omitted from the payload.
    // Therefore at present the greeter discovers the invitation id from session metadata, via the invitee's peer id.
    // TODO(dboreham): Invitation is actually invitationID.
    const localPeerId = invitation;
    log('Local PeerId:', keyToString(localPeerId));
    this._greeterPlugin = new GreetingCommandPlugin(Buffer.from(localPeerId), new Greeter().createMessageHandler());

    log(keyToString(localPeerId), 'connecting to', keyToString(swarmKey));

    const peerJoinedWaiter = waitForEvent(this._greeterPlugin, 'peer:joined',
      (remotePeerId: any) => remotePeerId && Buffer.from(responderPeerId).equals(remotePeerId),
      timeout, ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT);

    await this._networkManager.joinProtocolSwarm({
      topic: PublicKey.from(swarmKey),
      protocol: greetingProtocolProvider(swarmKey, localPeerId, [this._greeterPlugin]),
      peerId: PublicKey.from(localPeerId),
      topology: new FullyConnectedTopology(),
      label: 'Greeting initiator'
    });

    await peerJoinedWaiter;
    log('Connected');
    this._state = GreetingState.CONNECTED;
  }

  /**
   * Called after connecting to initiate greeting protocol exchange.
   */
  async redeemInvitation (secretProvider: SecretProvider): Promise<InvitationResult> {
    assert(this._state === GreetingState.CONNECTED);
    const { swarmKey } = this._invitationDescriptor;

    const responderPeerId = Buffer.from(swarmKey);

    /* The first step in redeeming the Invitation is the BEGIN command.
     * On the Greeter end, this is when it takes action (eg, generating a passcode)
     * starting the redemption of the Invitation.
     */

    assert(this._greeterPlugin); // Needed because typechecker complains that `_greeterPlugin` can possibly be undefined.
    const { info } = await this._greeterPlugin.send(responderPeerId, createGreetingBeginMessage() as any) as any;

    /* The next step is the HANDSHAKE command, which allow us to exchange additional
     * details with the Greeter. This step requires authentication, so we must obtain
     * a signature in the case of bot/key auth, or interactively from the user in the
     * case of PIN/passphrase auth.
     */

    log('Requesting secret...');
    const secret = Buffer.from(await secretProvider(info));
    log('Received secret');

    const handshakeResponse = await this._greeterPlugin.send(responderPeerId,
      createGreetingHandshakeMessage(secret)) as any;

    /* The last step is the NOTARIZE command, where we submit our signed credentials to the Greeter.
     * Until this point, we did not know the publicKey of the Party we had been invited to join.
     * Now we must know it, because it (and the nonce) are needed in our signed credentials.
     */

    // The result will include the partyKey and a nonce used when signing the response.
    const { nonce } = handshakeResponse;
    const partyKey = handshakeResponse.partyKey;

    const credentialMessages = await this._getMessagesToNotarize(PublicKey.from(partyKey), nonce);

    // Send the signed payload to the greeting responder.
    const notarizeResponse: NotarizeResponse = await this._greeterPlugin.send(responderPeerId,
      createGreetingNotarizeMessage(secret, credentialMessages as WithTypeUrl<Message>[]));

    //
    // We will receive back a collection of 'hints' of the keys and feeds that make up the Party.
    // Without these 'hints' we would have no way to begin replicating, because we would not know whom to trust.
    //

    // Tell the Greeter that we are done.
    try {
      await this._greeterPlugin.send(responderPeerId, createGreetingFinishMessage(secret));
    } catch (err: any) {
      log('Sending finish message failed.', err);
      // Failing to inform Greeter that we are done is not a critical failure.
    }

    await this.disconnect();

    this._state = GreetingState.SUCCEEDED;
    assert(notarizeResponse.genesisFeed);
    return {
      partyKey,
      genesisFeedKey: notarizeResponse.genesisFeed
    };
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
}

/**
 * Create credentials messages that should be written to invite new device to the HALO party.
 */
export const createHaloPartyAdmissionMessage = (
  credentialsSigner: CredentialsSigner,
  nonce: Uint8Array
): Message => createKeyAdmitMessage(
  credentialsSigner.signer,
  credentialsSigner.getIdentityKey().publicKey,
  credentialsSigner.getDeviceKey(),
  [],
  Buffer.from(nonce)
);

/**
 * Create credentials messages that should be written to invite member to the data party.
 */
export const createDataPartyAdmissionMessages = (
  credentialsSigner: CredentialsSigner,
  partyKey: PublicKey,
  identityGenesis: SignedMessage,
  nonce: Uint8Array
): Message => createEnvelopeMessage(
  credentialsSigner.signer,
  partyKey,
  wrapMessage(identityGenesis),
  [credentialsSigner.getDeviceSigningKeys()],
  Buffer.from(nonce)
);
