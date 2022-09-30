//
// Copyright 2019 DXOS.org
//

import debug from 'debug';
import { EventEmitter } from 'events';
import assert from 'node:assert';

import { discoveryKey } from '@dxos/crypto';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { KeyHint } from '@dxos/protocols/proto/dxos/halo/credentials/greet';
import { PartyCredential } from '@dxos/protocols/proto/dxos/halo/credentials/party';
import { KeyChain, KeyRecord, KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { Message, SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { isIdentityMessage, IdentityMessageProcessor, IdentityEvents } from '../identity';
import { Keyring, assertValidPublicKey, keyTypeName } from '../keys';
import { PartyEventType } from './events';
import { isEnvelope, isPartyInvitationMessage, isSignedMessage } from './party-credential';
import { PartyInvitationManager } from './party-invitation-manager';

const log = debug('dxos:halo:party');

/**
 * The party state is constructed via signed messages on the feeds.
 *
 * @event Party#'admit:key' fires on a new entity key admitted
 * @type {KeyRecord}
 *
 * @event Party#'update:key' fires when an existing entity key has attributes updated (eg, when 'hint' status is removed)
 * @type {KeyRecord}
 *
 * @event Party#'admit:feed' fires on a new feed key admitted
 * @type {KeyRecord}
 *
 * @event Party#'update:identityinfo' fires when IdentityInfo is added or updated.
 * @type {PublicKey}
 */
export class PartyState extends EventEmitter {
  _publicKey: PublicKey;
  _keyring: Keyring;
  _invitationManager: PartyInvitationManager;
  _identityMessageProcessor: IdentityMessageProcessor;
  // TODO(telackey): Switch to Buffer-aware maps.
  _credentialMessages: Map<string, SignedMessage>;
  _memberKeys: Map<string, PublicKey>;
  _memberFeeds: Map<string, PublicKey>;
  _admittedBy: Map<string, PublicKey>;
  _readyToProcess: Promise<KeyRecord>;

  /**
   * Initialize with party public key
   * @return {PartyState}
   */
  constructor (publicKey: PublicKeyLike) {
    super();

    assertValidPublicKey(publicKey);

    this._publicKey = PublicKey.from(publicKey);
    this._keyring = new Keyring();
    this._invitationManager = new PartyInvitationManager(this);
    this._identityMessageProcessor = new IdentityMessageProcessor(this);

    this._credentialMessages = new Map<string, SignedMessage>();
    this._memberKeys = new Map<string, PublicKey>();
    this._memberFeeds = new Map<string, PublicKey>();
    this._admittedBy = new Map<string, PublicKey>();

    // The Keyring must contain the Party key itself.
    this._readyToProcess = this._keyring.addPublicKey({
      publicKey: this._publicKey,
      type: KeyType.PARTY,
      own: false
    });

    // Surface IdentityMessageProcessor events.
    for (const eventName of IdentityEvents) {
      this._identityMessageProcessor.on(eventName, (...args) => this.emit(eventName, ...args));
    }
  }

  /**
   * The Party's public key.
   * @returns {PublicKey}
   */
  get publicKey () {
    return this._publicKey;
  }

  /**
   * The Party's discovery key.
   * @returns {PublicKey}
   */
  get discoveryKey () {
    return discoveryKey(this.publicKey.asBuffer());
  }

  /**
   * The Party's topic (hexified public key).
   * @return {string} topic for this party
   */
  get topic () {
    return this._publicKey.toHex();
  }

  /**
   * @return public keys for the feeds admitted to the Party.
   */
  get memberFeeds (): PublicKey[] {
    return Array.from(this._memberFeeds.values()).filter(key => this._keyring.isTrusted(key));
  }

  /**
   * @return public keys admitted to the Party.
   */
  get memberKeys (): PublicKey[] {
    return Array.from(this._memberKeys.values()).filter(key => this._keyring.isTrusted(key));
  }

  /**
   * Returns a map of the credential messages used to construct the Party membership, indexed by the key admitted.
   * This is necessary information for demonstrating the trust relationship between keys.
   */
  get credentialMessages () {
    return this._credentialMessages;
  }

  /**
   * Returns a map of SignedMessages used to describe keys. In many cases the contents are enough (see: getInfo)
   * but the original message is needed for copying into a new Party, as when an IdentityInfo message is copied
   * from the HALO Party to a Party that is being joined.
   */
  get infoMessages () {
    return this._identityMessageProcessor.infoMessages;
  }

  /**
   * Retrieve an PartyInvitation by its ID.
   */
  getInvitation (invitationID: Buffer) {
    assert(Buffer.isBuffer(invitationID), 'invitationID is not a buffer.');

    return this._invitationManager.getInvitation(invitationID);
  }

  /**
   * What member admitted the specified feed or member key?
   */
  getAdmittedBy (publicKey: PublicKey) {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);

    return this._admittedBy.get(publicKey.toHex());
  }

  /**
   * Get info for the specified key (if available).
   */
  getInfo (publicKey: PublicKey) {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);

    return this._identityMessageProcessor.getInfo(publicKey.asBuffer());
  }

  /**
   * Lookup the PublicKey for the Party member associated with this KeyChain.
   */
  findMemberKeyFromChain (chain: KeyChain) {
    assert(chain);

    const trustedKey = this._keyring.findTrusted(chain);
    return trustedKey && this.isMemberKey(trustedKey.publicKey) ? trustedKey.publicKey : undefined;
  }

  /**
   * Is the indicated key a trusted key associated with this party.
   */
  isMemberKey (publicKey: PublicKeyLike) {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);

    return this._memberKeys.has(publicKey.toHex()) && this._keyring.isTrusted(publicKey);
  }

  /**
   * Is the indicated key a trusted feed associated with this party.
   */
  isMemberFeed (publicKey: PublicKeyLike) {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);

    return this._memberFeeds.has(publicKey.toHex()) && this._keyring.isTrusted(publicKey);
  }

  /**
   * Process an ordered array of messages, for compatibility with Model.processMessages().
   * @param {Message[]} messages
   */
  async processMessages (messages: Message[]) {
    assert(Array.isArray(messages));

    for await (const message of messages) {
      assert(isSignedMessage(message.payload));
      await this._processMessage(message.payload);
    }
  }

  /**
   * Receive hints for keys and feeds.
   * See `proto/greet.proto` for details on the purpose and use of hints.
   * @param {KeyHint[]} hints
   */
  async takeHints (hints: KeyHint[] = []) {
    assert(Array.isArray(hints));

    for await (const hint of hints) {
      const { publicKey, type } = hint;
      assert(publicKey);
      assertValidPublicKey(publicKey);
      if (!this._keyring.hasKey(publicKey)) {
        const keyRecord = await this._admitKey(publicKey, { hint: true, type });
        if (KeyType.FEED === type) {
          this.emit(PartyEventType.ADMIT_FEED, keyRecord);
        } else {
          this.emit(PartyEventType.ADMIT_KEY, keyRecord);
        }
      }
    }
  }

  /**
   * Verifies the ENVELOPE message signature and extracts the inner message.
   */
  private _unpackEnvelope (message: SignedMessage) {
    let depth = 0;
    while (isEnvelope(message)) {
      // Verify the outer message is signed with a known, trusted key.
      this._verifyMessage(message, depth === 0);
      message = message.signed.payload.envelope.message.payload;
      depth++;
    }

    const { type } = message.signed.payload;
    const innerSignedBy = Keyring.signingKeys(message, { deep: false, validate: false });
    switch (type) {
      case PartyCredential.Type.KEY_ADMIT: {
        const { admitKey } = message.signed.payload.keyAdmit;
        assert(admitKey);
        assert(innerSignedBy.length >= 1);
        assert(innerSignedBy.find(key => key.equals(admitKey)));
        break;
      }
      case PartyCredential.Type.FEED_ADMIT: {
        const { feedKey } = message.signed.payload.feedAdmit;
        assert(feedKey);
        assert(innerSignedBy.length >= 1);
        assert(innerSignedBy.find(key => key.equals(feedKey)));
        break;
      }
      case PartyCredential.Type.ENVELOPE:
        break;
      default:
        throw new Error(`${type} not allowed in ENVELOPE`);
    }

    return message;
  }

  /**
   * Process a Party message.
   * @returns {void}
   */
  private async _processMessage (message: SignedMessage) {
    await this._readyToProcess;

    // All PartyInvitation messages are handled by the PartyInvitationManager.
    if (isPartyInvitationMessage(message)) {
      return this._invitationManager.recordInvitation(message);
    }

    if (isIdentityMessage(message)) {
      return this._identityMessageProcessor.processMessage(message);
    }

    return this._processCredentialMessage(message);
  }

  /**
   * Process a replicated Party credential message, admitting keys or feeds to the Party.
   * @returns {void}
   */
  private async _processCredentialMessage (message: SignedMessage) {
    assert(message);
    const original = message;

    if (!message.signed || !message.signed.payload ||
      !message.signatures || !Array.isArray(message.signatures)) {
      throw new Error(`Invalid message: ${JSON.stringify(message)}`);
    }

    const envelopedMessage = isEnvelope(message);
    if (envelopedMessage) {
      message = this._unpackEnvelope(message);
    }

    switch (message.signed.payload.type) {
      case PartyCredential.Type.PARTY_GENESIS: {
        const { admitKey, feedKey } = await this._processGenesisMessage(message);
        this._credentialMessages.set(admitKey.publicKey.toHex(), original);
        this._credentialMessages.set(feedKey.publicKey.toHex(), original);

        // There is no question of who is admitting on the GENESIS.
        this._admittedBy.set(admitKey.publicKey.toHex(), this._publicKey);
        this._admittedBy.set(feedKey.publicKey.toHex(), this._publicKey);

        this.emit(PartyEventType.ADMIT_KEY, admitKey);
        this.emit(PartyEventType.ADMIT_FEED, feedKey);
        break;
      }

      case PartyCredential.Type.KEY_ADMIT: {
        const admitKey = await this._processKeyAdmitMessage(message, !envelopedMessage, !envelopedMessage);
        this._credentialMessages.set(admitKey.publicKey.toHex(), original);

        const admittedBy = this._determineAdmittingMember(admitKey.publicKey, original);
        assert(admittedBy);
        this._admittedBy.set(admitKey.publicKey.toHex(), admittedBy);
        log(`Key ${admitKey.publicKey.toHex()} admitted by ${admittedBy.toHex()}.`);

        this.emit(PartyEventType.ADMIT_KEY, admitKey);
        break;
      }

      case PartyCredential.Type.FEED_ADMIT: {
        const feedKey = await this._processFeedAdmitMessage(message, !envelopedMessage);
        this._credentialMessages.set(feedKey.publicKey.toHex(), original);

        /* This uses 'message' rather than 'original', since in a Greeting/Envelope case we want to record the
         * feed's actual owner, not the Greeter writing the message on their behalf.
         */
        const admittedBy = this._determineAdmittingMember(feedKey.publicKey, message);
        assert(admittedBy);
        this._admittedBy.set(feedKey.publicKey.toHex(), admittedBy);
        log(`Feed ${feedKey.publicKey.toHex()} admitted by ${admittedBy.toHex()}.`);

        this.emit(PartyEventType.ADMIT_FEED, feedKey);
        break;
      }

      default:
        throw new Error(`Invalid type: ${message.signed.payload.type}`);
    }
  }

  /**
   * Processes a PartyGenesis message, the start-of-authority for the Party.
   * @param {SignedMessage} message
   * @returns {void}
   * @private
   */
  private async _processGenesisMessage (message: SignedMessage) {
    assert(message);

    if (message.signed.payload.type !== PartyCredential.Type.PARTY_GENESIS) {
      throw new Error(`Invalid type: ${message.signed.payload.type} !== PARTY_GENESIS`);
    }

    // The Genesis is the root message, so cannot require a previous key.
    this._verifyMessage(message);

    const { admitKey, admitKeyType, feedKey } = message.signed.payload.partyGenesis;

    const admitRecord = await this._admitKey(admitKey, { type: admitKeyType });
    const feedRecord = await this._admitKey(feedKey, { type: KeyType.FEED });

    return {
      admitKey: admitRecord,
      feedKey: feedRecord
    };
  }

  /**
   * Processes an AdmitKey message, admitting a single key as a member of the Party.
   * @returns {void}
   * @private
   */
  private async _processKeyAdmitMessage (message: SignedMessage,
    requireSignatureFromTrustedKey: boolean,
    requirePartyMatch: boolean) {
    assert(message);

    if (message.signed.payload.type !== PartyCredential.Type.KEY_ADMIT) {
      throw new Error(`Invalid type: ${message.signed.payload.type} !== KEY_ADMIT`);
    }

    this._verifyMessage(message, requireSignatureFromTrustedKey, requirePartyMatch);

    const { admitKey, admitKeyType } = message.signed.payload.keyAdmit;

    return this._admitKey(admitKey, { type: admitKeyType });
  }

  /**
   * Processes an AdmitFeed message, admitting a single feed to participate in the Party.
   */
  private async _processFeedAdmitMessage (message: SignedMessage, requireSignatureFromTrustedKey: boolean) {
    assert(message);

    if (message.signed.payload.type !== PartyCredential.Type.FEED_ADMIT) {
      throw new Error(`Invalid type: ${message.signed.payload.type} !== FEED_ADMIT`);
    }

    this._verifyMessage(message, requireSignatureFromTrustedKey);

    const { feedKey } = message.signed.payload.feedAdmit;

    return this._admitKey(feedKey, { type: KeyType.FEED });
  }

  /**
   * Verify that the signatures on this message are present, correct, and from trusted members of this Party.
   * @return {boolean}
   */
  verifySignatures (message: SignedMessage) {
    assert(message, 'message null or undefined');

    return this._keyring.verify(message);
  }

  /**
   * Verify the signatures and basic structure common to all messages.
   * By default, a signature from a known, trusted key is required. In the case of an ENVELOPE, the outer message
   * will be signed by a trusted key (the key of the Greeter), but the inner key will be self-signed. In that case
   * requireSignatureFromTrustedKey should be set to false when testing the inner message.
   * @returns {boolean}
   * @private
   */
  private _verifyMessage (message: SignedMessage, requireSignatureFromTrustedKey = true, requirePartyMatch = true) {
    assert(message);

    const { signed, signatures } = message;
    if (!signed || !signatures || !Array.isArray(signatures)) {
      throw new Error(`Invalid message: ${message}`);
    }

    const checkParty = (partyKey: PublicKeyLike) => {
      partyKey = PublicKey.from(partyKey);
      if (requirePartyMatch && !this._publicKey.equals(partyKey)) {
        throw new Error(`Invalid party: ${partyKey.toHex()}`);
      }
    };

    switch (signed.payload.type) {
      case PartyCredential.Type.PARTY_GENESIS: {
        const { partyKey, admitKey, feedKey } = message.signed.payload.partyGenesis;
        checkParty(partyKey);

        if (!admitKey || !feedKey) {
          console.log(message);
          throw new Error(`Invalid message: ${message}`);
        }

        if (!Keyring.signingKeys(message, { deep: false, validate: false }).find(k => k.equals(this._publicKey))) {
          throw new Error(`Invalid message, Genesis not signed by party key: ${message}`);
        }
        break;
      }

      case PartyCredential.Type.FEED_ADMIT: {
        const { partyKey, feedKey } = message.signed.payload.feedAdmit;
        checkParty(partyKey);

        if (!feedKey) {
          throw new Error(`Invalid message: ${message}`);
        }
        break;
      }

      case PartyCredential.Type.KEY_ADMIT: {
        const { partyKey, admitKey } = message.signed.payload.keyAdmit;
        checkParty(partyKey);

        if (!admitKey) {
          throw new Error(`Invalid message: ${message}`);
        }
        break;
      }

      case PartyCredential.Type.ENVELOPE: {
        const { partyKey } = message.signed.payload.envelope;
        if (!partyKey) {
          throw new Error(`Invalid message: ${message}`);
        }
        checkParty(partyKey);
        break;
      }

      default:
        throw new Error(`Invalid type: ${signed.payload.type}`);
    }

    const sigOk = requireSignatureFromTrustedKey
      ? this._keyring.verify(message)
      : Keyring.validateSignatures(message);
    if (!sigOk) {
      throw new Error(`Rejecting unverified message: ${message}.`);
    }
  }

  /**
   * Admit the key to the allowed list.
   * @param {PublicKeyLike} publicKey
   * @param attributes
   * @returns {boolean} true if added, false if already present
   * @private
   */
  private async _admitKey (publicKey: PublicKeyLike, attributes: any = {}) {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);
    const keyStr = publicKey.toHex();

    const makeRecord = () => ({
      type: KeyType.UNKNOWN,
      trusted: true,
      own: false,
      ...attributes, // Let attributes clobber the defaults.
      publicKey
    });

    let keyRecord = this._keyring.getKey(publicKey);
    if (!keyRecord) {
      keyRecord = await this._keyring.addPublicKey(makeRecord());
    } else if (keyRecord.hint && !attributes.hint) {
      keyRecord = await this._keyring.updateKey(makeRecord());
      this.emit(PartyEventType.UPDATE_KEY, keyRecord);
    }

    if (keyRecord.type === KeyType.FEED) {
      if (!this._memberFeeds.has(keyStr)) {
        log(`Admitting feed: ${keyStr} to ${this.topic}.`);
        this._memberFeeds.set(keyStr, publicKey);
      }
    } else if (!this._memberKeys.has(keyStr)) {
      log(`Admitting ${keyTypeName(keyRecord.type)}: ${keyStr} to party: ${this.topic}.`);
      this._memberKeys.set(keyStr, publicKey);
    }

    return keyRecord;
  }

  /**
   * Determine which Party member is admitting a particular credential message.
   * @returns {undefined|PublicKey}
   * @private
   */
  private _determineAdmittingMember (publicKey: PublicKey, message: SignedMessage) {
    if (publicKey.equals(this._publicKey)) {
      return this._publicKey;
    }

    const signingKeys = Keyring.signingKeys(message, { validate: false });
    for (const key of signingKeys) {
      if (!key.equals(publicKey)) {
        if (this.isMemberKey(key)) {
          return key;
        }
      }
    }
    return undefined;
  }
}
