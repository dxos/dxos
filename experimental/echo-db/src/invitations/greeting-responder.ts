//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import {
  createEnvelopeMessage, Greeter,
  GreetingCommandPlugin,
  KeyRecord,
  Keyring,
  KeyType
} from '@dxos/credentials';
import { keyToBuffer, keyToString, randomBytes } from '@dxos/crypto';
import { FeedKey, PartyKey, SwarmKey } from '@dxos/experimental-echo-protocol';
import { NetworkManager } from '@dxos/network-manager';

import { Party } from '../parties';
import { SecretProvider, SecretValidator } from './common';
import { greetingProtocolProvider } from './greeting-protocol-provider';

const log = debug('dxos:party-manager:greeting-responder');

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
  private readonly _greeter: Greeter;

  private readonly _greeterPlugin: GreetingCommandPlugin;

  private readonly _swarmKey: SwarmKey = randomBytes();

  private _state: GreetingState = GreetingState.INITIALIZED;

  /**
   * Param: Invitation id
   */
  readonly connected = new Event<any>();

  constructor (
    private readonly _partyKey: PartyKey, // TODO(burdon): Move to bottom.
    private readonly _keyring: Keyring,
    private readonly _networkManager: NetworkManager,
    private readonly _writeStream: NodeJS.WritableStream,
    private readonly _getMemberFeeds: () => FeedKey[], // TODO(burdon): Is callback required?
    private readonly _identityKeypair: KeyRecord
  ) {
    this._greeter = new Greeter(
      Buffer.from(this._partyKey),
      async (messages: any) => this._writeCredentialsToParty(messages),
      async () => this._gatherHints()
    );

    this._greeterPlugin = new GreetingCommandPlugin(this._swarmKey, this._greeter.createMessageHandler());
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
   * @param {function} [onFinish] A function to be called when the invitation is closed (successfully or not).
   * @param {int} [expiration] Date.now()-style timestamp of when this invitation should expire.
   */
  // TODO(burdon): Rename listenForXXX?
  async invite (
    secretValidator: SecretValidator,
    secretProvider?: SecretProvider,
    onFinish?: Function,
    expiration?: number
  ): Promise<Buffer> {
    assert(secretValidator);
    assert(this._state === GreetingState.LISTENING);

    let timeout: NodeJS.Timeout;
    const cleanup = async () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (onFinish) {
        try {
          await onFinish();
        } catch (err) {
          log(err);
        }
      }

      return this.destroy();
    };

    // TODO(telackey): This seems fragile - how do we know expiration is in the future?
    if (expiration) {
      timeout = setTimeout(cleanup, expiration - Date.now());
    }

    const invitation = this._greeter.createInvitation(
      this._partyKey,
      secretValidator,
      secretProvider,
      cleanup,
      expiration
    );

    // TODO(dboreham): Add tests for idempotence and transactional integrity over the greet flow.
    (this._greeterPlugin as any).once('peer:joined', (joinedPeerId: Buffer) => {
      if (keyToString(joinedPeerId) === invitation.id) {
        log(`Initiator connected: ${keyToString(joinedPeerId)}`);
        this._state = GreetingState.CONNECTED;
        this.connected.emit(invitation.id);
      } else {
        log(`Unexpected initiator connected: ${keyToString(joinedPeerId)}`);
      }
    });

    return keyToBuffer(invitation.id);
  }

  /**
   * Start listening for connections.
   */
  async start () {
    log('Starting...');
    assert(this._state === GreetingState.INITIALIZED);

    // As the Greeter, use the topic as our peerId.
    // (For reasons why see detailed comment on greetClient).
    await this._networkManager.joinProtocolSwarm(Buffer.from(this._swarmKey),
      greetingProtocolProvider(this._swarmKey, this._swarmKey, [this._greeterPlugin]));

    log(`Greeting for: ${keyToString(this._partyKey)} on swarmKey ${keyToString(this._swarmKey)}`);

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
      await this._networkManager.leaveProtocolSwarm(Buffer.from(this._swarmKey));
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

    // These messages will be self-signed by keys not yet admitted to the Party,, so we cannot check
    // for a trusted key, only that the signatures are valid.
    for (const message of messages) {
      const ok = Keyring.validateSignatures(message.payload);
      if (!ok) {
        throw new Error('Bad signature');
      }
    }

    // Place the self-signed messages inside an Envelope, sign then write the signed Envelope to the Party.
    const envelopes = [];
    for (const message of messages) {
      // wait for keys to be admitted
      // const myAdmits = admitsKeys(message);
      // const partyMessageWaiter = waitForEvent(this._partyManager, 'party:update',
      //   (eventPartyKey) => {
      //     let matchCount = 0;
      //     if (eventPartyKey.equals(this._party.publicKey)) {
      //       for (const key of myAdmits) {
      //         if (this._party.isMemberKey(key) || this._party.isMemberFeed(key)) {
      //           matchCount++;
      //         }
      //       }
      //     }
      //     return matchCount === myAdmits.length;
      //   });

      const envelope = createEnvelopeMessage(this._keyring, Buffer.from(this._partyKey), message, [this._identityKeypair], null);
      this._writeStream.write(envelope as any, () => { /** TODO(marik-d): await callback */ });

      // await partyMessageWaiter;
      envelopes.push(envelope);
    }
    this._state = GreetingState.SUCCEEDED;

    log('Wrote messages to local party feed');
    // Return the signed messages to the caller because copies are sent back to the invitee.
    return envelopes;
  }

  /**
   * Callback to gather member key and feed "hints" for the Invitee.
   * @return {KeyHint[]}
   * @private
   */
  _gatherHints () {
    assert(this._state === GreetingState.SUCCEEDED);

    // const memberKeys = this._party.memberKeys.map(publicKey => {
    //   return {
    //     publicKey,
    //     type: this._party.keyring.getKey(publicKey).type
    //   };
    // });

    const memberFeeds = this._getMemberFeeds().map(publicKey => {
      return {
        publicKey,
        type: KeyType.FEED
      };
    });

    // TODO(marik-d): Include memberKeys.
    return [...memberFeeds];
  }
}
