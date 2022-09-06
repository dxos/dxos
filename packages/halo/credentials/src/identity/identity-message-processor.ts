//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { EventEmitter } from 'events';
import assert from 'node:assert';

import { PublicKey, PublicKeyLike } from '@dxos/protocols';

import { isDeviceInfoMessage, isIdentityInfoMessage } from '../identity';
import { Keyring, assertValidPublicKey } from '../keys';
import { PartyState, isEnvelope, isSignedMessage } from '../party';
import { SignedMessage } from '../proto';

const log = debug('dxos:halo:party');

/**
 * Process and manage IdentityInfo, DeviceInfo, and other "identity" Party messages.
 * @event IdentityMessageProcessor#set:identityinfo  When a new IdentityInfo record is set.
 */
export class IdentityMessageProcessor extends EventEmitter {
  _party: PartyState;

  // TODO(telackey): Switch to Buffer-aware maps.
  _infoMessages: Map<string, SignedMessage>;

  constructor (party: PartyState) {
    super();
    assert(party);

    this._party = party;
    this._infoMessages = new Map<string, SignedMessage>();
  }

  /**
   * Returns a map of SignedMessages used to describe keys. In many cases the contents are enough (see: getInfo)
   * but the original message is needed for copying into a new Party, as when an IdentityInfo message is copied
   * from the HALO Party to a Party that is being joined.
   * @return {Map<string, Message>}
   */
  get infoMessages () {
    return this._infoMessages;
  }

  /**
   * Get info for the specified key (if available).
   * @return {IdentityInfo | DeviceInfo | undefined}
   */
  getInfo (publicKey: PublicKeyLike) {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);

    const message = this._infoMessages.get(publicKey.toHex());
    // The saved copy is a SignedMessage, but we only want to return the contents.
    return message ? message.signed.payload : undefined;
  }

  /**
   * Process 'info' message (IdentityInfo, DeviceInfo, etc.)
   * @return {Promise<void>}
   */
  async processMessage (message: SignedMessage) {
    assert(message);
    assert(isSignedMessage(message), `Not signed: ${JSON.stringify(message)}`);

    if (!this._party.verifySignatures(message)) {
      throw new Error(`Verification failed: ${JSON.stringify(message)}`);
    }

    if (isIdentityInfoMessage(message)) {
      return this._processIdentityInfoMessage(message);
    }

    if (isDeviceInfoMessage(message)) {
      // TODO(telackey): Implement.
      log('WARNING: Not yet implemented.');
    }
  }

  /**
   * Process an IdentityInfo message.
   * @return {Promise<void>}
   * @private
   */
  async _processIdentityInfoMessage (message: SignedMessage) {
    let identityKey: PublicKey;
    let partyKey: PublicKey;
    let signedIdentityInfo: SignedMessage;

    if (isEnvelope(message)) {
      // If this message has an Envelope, the Envelope must match this Party.
      signedIdentityInfo = message.signed.payload.envelope.message.payload;
      identityKey = PublicKey.from(signedIdentityInfo.signed.payload.publicKey);
      partyKey = message.signed.payload.envelope.partyKey;

      assert(isSignedMessage(signedIdentityInfo));
      assert(message.signatures);

      // Make sure the Envelope is signed with that particular Identity key or a chain that leads back to it.
      let signatureMatch = false;
      for (const signature of message.signatures) {
        // If this has a KeyChain, check its trusted parent key, else use this exact key.
        const signingKey = signature.keyChain
          ? this._party.findMemberKeyFromChain(signature.keyChain)
          : signature.key;
        if (signingKey && identityKey.equals(signingKey)) {
          signatureMatch = true;
          break;
        }
      }

      if (!signatureMatch) {
        throw new Error(`Invalid Envelope for IdentityInfo, not signed by proper key: ${JSON.stringify(message)}`);
      }
    } else {
      // If this message has no Envelope, the Identity key itself must match the Party.
      signedIdentityInfo = message;
      identityKey = PublicKey.from(signedIdentityInfo.signed.payload.publicKey);
      partyKey = identityKey;
    }

    // Check the inner message signature.
    if (!Keyring.signingKeys(signedIdentityInfo, { deep: false }).find(key => key.equals(identityKey))) {
      throw new Error(`Invalid IdentityInfo, not signed by Identity key: ${JSON.stringify(signedIdentityInfo)}`);
    }

    // Check the target Party matches.
    if (!partyKey || !this._party.publicKey.equals(partyKey)) {
      throw new Error(`Invalid party: ${partyKey.toHex()}`);
    }

    // Check membership.
    if (!identityKey || !this._party.isMemberKey(identityKey)) {
      throw new Error(`Invalid IdentityInfo, not a member: ${identityKey.toHex()}`);
    }

    this._infoMessages.set(identityKey.toHex(), signedIdentityInfo);
    this.emit('update:identityinfo', identityKey);
  }
}
