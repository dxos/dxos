//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { waitForEvent } from '@dxos/async';
import {
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createGreetingBeginMessage,
  createGreetingFinishMessage,
  createGreetingHandshakeMessage,
  createGreetingNotarizeMessage,
  createKeyAdmitMessage,
  wrapMessage,
  Greeter,
  GreetingCommandPlugin,
  Message,
  WithTypeUrl
} from '@dxos/credentials';
import { keyToString, PublicKey } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';
import { FullyConnectedTopology, NetworkManager } from '@dxos/network-manager';

import { Identity } from '../halo';
import { SecretProvider } from './common';
import { greetingProtocolProvider } from './greeting-protocol-provider';
import { GreetingState } from './greeting-responder';
import { InvitationDescriptor, InvitationDescriptorType } from './invitation-descriptor';

const log = debug('dxos:echo:invitations:greeting-initiator');

const DEFAULT_TIMEOUT = 30_000;

/**
 * Attempts to connect to a greeting responder to 'redeem' an invitation, potentially with some out-of-band
 * authentication check, in order to be admitted to a Party.
 */
export class GreetingInitiator {
  private _greeterPlugin?: GreetingCommandPlugin;

  // TODO(dboreham): can we use the same states as the responder?
  private _state: GreetingState = GreetingState.INITIALIZED;

  /**
   * @param _networkManager
   * @param _identity
   * @param _invitationDescriptor
   * @param _feedInitializer Callback to open or create a write feed for this party and return it's keypair.
   */
  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _identity: Identity,
    private readonly _invitationDescriptor: InvitationDescriptor,
    private readonly _feedInitializer: (partyKey: PartyKey) => Promise<any /* Keypair */>
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

    // TODO(telackey): Clarify what this comment means:
    // TODO(telackey): We don't have the descriptor yet, but it must include at least this.
    const { swarmKey, invitation } = this._invitationDescriptor;

    // Due to limitations in @dxos/protocol and hypercore-protocol, a requester in a request/response
    // interaction with a responder must know the responder's peer id. Therefore we communicate its peer
    // id in the invitation, as the greet swarm key. That is: greet swarm key, which is a unique key to serve
    // its purpose of uniquely identifying each greeter, is by convention also used as the peer id by the greeter
    // and so can be used here as the responder peer id in the greeting interaction.
    const responderPeerId = Buffer.from(swarmKey);

    // Use the invitation ID as our peerId.
    // This is due to a bug in the protocol where the invitation id is omitted from the payload.
    // Therefore at present the greeter discovers the invitation id from session metadata, via the invitee's peer id.
    // TODO(dboreham): invitation is actually invitationID.
    const localPeerId = invitation;
    log('Local PeerId:', keyToString(localPeerId));
    this._greeterPlugin = new GreetingCommandPlugin(localPeerId, (new Greeter()).createMessageHandler());

    log(keyToString(localPeerId), 'connecting to', keyToString(swarmKey));
    const peerJoinedWaiter = waitForEvent(this._greeterPlugin, 'peer:joined',
      (remotePeerId: any) => remotePeerId && Buffer.from(responderPeerId).equals(remotePeerId), timeout);

    await this._networkManager.joinProtocolSwarm({
      topic: PublicKey.from(swarmKey),
      protocol: greetingProtocolProvider(swarmKey, localPeerId, [this._greeterPlugin], { initiator: true }),
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
  async redeemInvitation (secretProvider: SecretProvider) {
    assert(this._state === GreetingState.CONNECTED);
    const { swarmKey } = this._invitationDescriptor;
    const haloInvitation = !!this._invitationDescriptor.identityKey;

    const responderPeerId = Buffer.from(swarmKey);

    //
    // The first step in redeeming the Invitation is the BEGIN command.
    // On the Greeter end, this is when it takes action (e.g., generating a passcode)
    // starting the redemption of the Invitation.
    //

    assert(this._greeterPlugin); // Needed because typechecker complains that `_greeterPlugin` can possibly be undefined.
    const { info } = await this._greeterPlugin.send(responderPeerId, createGreetingBeginMessage() as any) as any;

    //
    // The next step is the HANDSHAKE command, which allow us to exchange additional
    // details with the Greeter. This step requires authentication, so we must obtain
    // a signature in the case of bot/key auth, or interactively from the user in the
    // case of PIN/passphrase auth.
    //

    log('Requesting secret...');
    const secret = Buffer.from(await secretProvider(info));
    log('Received secret');

    const handshakeResponse = await this._greeterPlugin.send(responderPeerId,
      createGreetingHandshakeMessage(secret)) as any;

    //
    // The last step is the NOTARIZE command, where we submit our signed credentials to the Greeter.
    // Until this point, we did not know the publicKey of the Party we had been invited to join.
    // Now we must know it, because it (and the nonce) are needed in our signed credentials.
    //

    // The result will include the partyKey and a nonce used when signing the response.
    const { nonce } = handshakeResponse;
    const partyKey = handshakeResponse.partyKey;

    const feedKey = await this._feedInitializer(partyKey);

    const credentialMessages = [];
    if (haloInvitation) {
      assert(this._identity.deviceKey, 'Device key required');

      // For the HALO, add the DEVICE directly.
      credentialMessages.push(
        createKeyAdmitMessage(
          this._identity.keyring,
          partyKey,
          this._identity.deviceKey,
          [],
          nonce)
      );

      // And Feed, signed for by the FEED and the DEVICE.
      credentialMessages.push(
        createFeedAdmitMessage(
          this._identity.keyring,
          partyKey,
          feedKey,
          [this._identity.deviceKey],
          nonce)
      );
    } else {
      assert(this._identity.deviceKeyChain, 'Device key required');
      assert(this._identity.identityGenesis, 'Identity genesis message required');

      // For any other Party, add the IDENTITY, signed by the DEVICE keychain, which links back to that IDENTITY.
      credentialMessages.push(
        createEnvelopeMessage(
          this._identity.keyring,
          partyKey,
          wrapMessage(this._identity.identityGenesis),
          [this._identity.deviceKeyChain],
          nonce)
      );

      // And the Feed, signed for by the FEED and by the DEVICE keychain, as above.
      credentialMessages.push(
        createFeedAdmitMessage(
          this._identity.keyring,
          partyKey,
          feedKey,
          [this._identity.deviceKeyChain],
          nonce)
      );
    }

    // Send the signed payload to the greeting responder.
    const notarizeResponse = await this._greeterPlugin.send(responderPeerId,
      createGreetingNotarizeMessage(secret, credentialMessages as WithTypeUrl<Message>[]));

    //
    // We will receive back a collection of 'hints' of the keys and feeds that make up the Party.
    // Without these 'hints' we would have no way to begin replicating, because we would not know whom to trust.
    //

    // Tell the Greeter that we are done.
    await this._greeterPlugin.send(responderPeerId, createGreetingFinishMessage(secret));

    await this.disconnect();

    this._state = GreetingState.SUCCEEDED;
    return {
      partyKey,
      hints: notarizeResponse.hints
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
