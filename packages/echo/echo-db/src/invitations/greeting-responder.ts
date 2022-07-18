//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, waitForCondition } from '@dxos/async';
import {
  admitsKeys,
  createEnvelopeMessage, Greeter,
  GreetingCommandPlugin,
  Keyring,
  SecretProvider,
  SecretValidator,
  Message as HaloMessage
} from '@dxos/credentials';
import { keyToString, randomBytes, PublicKey } from '@dxos/crypto';
import { FeedWriter, SwarmKey } from '@dxos/echo-protocol';
import { FullyConnectedTopology, NetworkManager } from '@dxos/network-manager';

import { PartyStateProvider } from '../pipeline';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { InvitationOptions } from './common';
import { greetingProtocolProvider } from './greeting-protocol-provider';

const log = debug('dxos:echo-db:greeting-responder');

/**
 * GreetingResponder transitions through the following states:
 */
export enum GreetingState {
  INITIALIZED = 'INITIALIZED', // Initial state.
  LISTENING = 'LISTENING', // After INITIALIZED, now listening for initiator connections.
  CONNECTED = 'CONNECTED', // An initiator has connected. Reverts to LISTENING if this initiator fails.
  SUCCEEDED = 'SUCCEEDED', // An initiator succeeded and has been admitted. Only one successful initiator is permitted.
  STOPPED = 'STOPPED', // No longer listening.
  DESTROYED = 'DESTROYED', // Responder no longer usable.
  DISCONNECTED = 'DISCONNECTED',
}

/**
 * Listens for greeting connections from invitees for a specific invitation specified by an invitation descriptor.
 * Upon successful greeting, the peer is admitted into the Party specified in the invitation descriptor.
 */
export class GreetingResponder {
  private readonly _greeterPlugin: GreetingCommandPlugin;
  private readonly _swarmKey: SwarmKey = randomBytes();
  private readonly _greeter: Greeter;

  private _state: GreetingState = GreetingState.INITIALIZED;

  /**
   * Param: Invitation id
   */
  readonly connected = new Event<any>();

  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _partyProcessor: PartyStateProvider,
    private readonly _genesisFeedKey: PublicKey,
    private readonly _credentialsSigner: CredentialsSigner,
    private readonly _credentialsWriter: FeedWriter<HaloMessage>
  ) {
    this._greeter = new Greeter(
      this._partyProcessor.partyKey,
      this._genesisFeedKey,
      async (messages: any) => this._writeCredentialsToParty(messages)
    );

    this._greeterPlugin = new GreetingCommandPlugin(Buffer.from(this._swarmKey), this._greeter.createMessageHandler());
  }

  /**
   * Accessor for UI to display status to the user.
   * Return the current state for this Greeting Responder (waiting, peer connected, successful auth, auth failed, etc.)
   * @return {GreetingState}
   */
  get state () {
    return this._state;
  }

  /**
   * Listen for connections from invitee peers.
   * @param secretValidator
   * @param secretProvider
   * @param onFinish A function to be called when the invitation is closed (successfully or not).
   * @param expiration Date.now()-style timestamp of when this invitation should expire.
   */
  // TODO(burdon): Rename listenForXXX?
  async invite (
    secretValidator: SecretValidator,
    secretProvider?: SecretProvider,
    onFinish?: InvitationOptions['onFinish'],
    expiration?: number
  ): Promise<Buffer> {
    assert(secretValidator);
    assert(this._state === GreetingState.LISTENING);

    let timeout: NodeJS.Timeout;
    const cleanup = async (expired?: boolean) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (onFinish) {
        try {
          await onFinish({ expired: expired === true });
        } catch (err: any) {
          log(err);
        }
      }

      return this.destroy();
    };

    if (expiration) {
      timeout = setTimeout(() => cleanup(true), expiration - Date.now());
    }

    const invitation = this._greeter.createInvitation(
      this._partyProcessor.partyKey,
      secretValidator,
      secretProvider,
      cleanup,
      expiration
    );

    // TODO(dboreham): Add tests for idempotence and transactional integrity over the greet flow.
    (this._greeterPlugin as any).once('peer:joined', (joinedPeerId: Buffer) => {
      if (joinedPeerId.equals(invitation.id)) {
        log(`Initiator connected: ${keyToString(joinedPeerId)}`);
        this._state = GreetingState.CONNECTED;
        this.connected.emit(invitation.id);
      } else {
        log(`Unexpected initiator connected: ${keyToString(joinedPeerId)}`);
      }
    });

    return invitation.id;
  }

  /**
   * Start listening for connections.
   */
  async start () {
    log('Starting...');
    assert(this._state === GreetingState.INITIALIZED);

    // As the Greeter, use the topic as our peerId.
    // (For reasons why see detailed comment on greetClient).
    await this._networkManager.joinProtocolSwarm({
      topic: PublicKey.from(this._swarmKey),
      protocol: greetingProtocolProvider(this._swarmKey, this._swarmKey, [this._greeterPlugin]),
      peerId: PublicKey.from(this._swarmKey),
      topology: new FullyConnectedTopology(),
      label: 'Greeting responder'
    });

    log(`Greeting for: ${this._partyProcessor.partyKey.toHex()} on swarmKey ${keyToString(this._swarmKey)}`);

    this._state = GreetingState.LISTENING;
    log('Listening');
    return this._swarmKey;
  }

  /**
   * Stop listening for connections. Until destroy() is called, getState() continues to work.
   */
  async stop () {
    log('Stopping...');
    if (this._swarmKey) {
      await this._networkManager.leaveProtocolSwarm(PublicKey.from(this._swarmKey));
    }

    this._state = GreetingState.STOPPED;
    log('Stopped');
  }

  /**
   * Call to clean up. Subsequent calls to any method have undefined results.
   */
  async destroy () {
    log('Destroying...');
    await this.stop();
    this._state = GreetingState.DESTROYED;
    log('Destroyed');
  }

  /**
   * Callback which writes the Invitee's messages to the Party, signed by our key.
   * @param {Message[]} messages
   * @return {Promise<[Message]>}
   * @private
   */
  async _writeCredentialsToParty (messages: any[]) {
    assert(this._state === GreetingState.CONNECTED);

    /* These messages will be self-signed by keys not yet admitted to the Party,, so we cannot check
     * for a trusted key, only that the signatures are valid.
     */
    for (const message of messages) {
      const ok = Keyring.validateSignatures(message.payload);
      if (!ok) {
        throw new Error('Bad signature');
      }
    }

    // Place the self-signed messages inside an Envelope, sign then write the signed Envelope to the Party.
    const envelopes = [];
    for (const message of messages) {
      // TODO(dmaretskyi): Refactor to pass in a callback: `await admitKeys(messages)`.
      const admittedKeys = admitsKeys(message);

      // TODO(telackey): Add hasKey/isMember to PartyProcessor?
      const hasKey = (key: PublicKey) => {
        const allKeys = [...this._partyProcessor.memberKeys, ...this._partyProcessor.feedKeys];
        return allKeys.find(value => value.equals(key));
      };

      const envelope = createEnvelopeMessage(
        this._credentialsSigner.signer,
        this._partyProcessor.partyKey,
        message,
        [this._credentialsSigner.getDeviceSigningKeys()]
      );

      await this._credentialsWriter.write(envelope);

      // Wait for keys to be admitted.
      await waitForCondition(() => admittedKeys.every(hasKey));

      envelopes.push(envelope);
    }
    this._state = GreetingState.SUCCEEDED;

    log('Wrote messages to local party feed');
    // Return the signed messages to the caller because copies are sent back to the invitee.
    return envelopes;
  }
}
