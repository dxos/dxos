//
// Copyright 2019 DXOS.org
//

import memdown from 'memdown';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import {
  KeyPair, randomBytes, sign as cryptoSign, verify as cryptoVerify
} from '@dxos/crypto';
import { PublicKey, PublicKeyLike } from '@dxos/protocols';
import { arraysEqual } from '@dxos/util';

import { isSignedMessage, unwrapMessage } from '../party';
import {
  KeyChain, KeyRecord, KeyRecordList, KeyType, Message, SignedMessage, WithTypeUrl, createDateTimeString
} from '../proto';
import { RawSignature } from '../typedefs';
import { Filter, FilterFunction } from './filter';
import {
  assertNoSecrets,
  assertValidKeyPair,
  assertValidPublicKey,
  assertValidSecretKey,
  canonicalStringify,
  checkAndNormalizeKeyRecord,
  createKeyRecord,
  isKeyChain,
  stripSecrets
} from './keyring-helpers';
import { KeyStore } from './keystore';
import { Signer } from './signer';
import { SimpleMetrics, createMeter } from './simple-metrics';

const metrics = new SimpleMetrics();
const meter = createMeter(metrics);
const cacheMetrics = new SimpleMetrics();
const cacheMeter = createMeter(cacheMetrics);

/**
 * A simple helper class for caching signature validation results.
 * Any change to the object will invalidates the cache entry for that object.
 */
class SignatureValidationCache {
  private readonly _cache = new WeakMap<any, { valid: boolean, sig: Buffer, key: PublicKey, stringy: string }[]>();

  @cacheMeter
  public set (obj: any, sig: RawSignature, key: PublicKeyLike, valid: boolean) {
    let sigResults = this._cache.get(obj);
    if (!sigResults) {
      sigResults = [];
      this._cache.set(obj, sigResults);
    }
    sigResults.push({ valid, sig: Buffer.from(sig), key: PublicKey.from(key), stringy: canonicalStringify(obj) });
  }

  @cacheMeter
  public get (obj: any, sig: RawSignature, key: PublicKeyLike) {
    const sigResults = this._cache.get(obj) || [];
    if (sigResults.length) {
      const stringy = canonicalStringify(obj);
      for (const result of sigResults) {
        if (arraysEqual(result.sig, sig) && result.key.equals(key) && result.stringy === stringy) {
          cacheMetrics.inc('HIT');
          return result.valid;
        }
      }
    }
    cacheMetrics.inc('MISS');
    return undefined;
  }
}

/**
 * A class for generating and managing keys, signing and verifying messages with them.
 * NOTE: This implements a write-through cache.
 */
export class Keyring implements Signer {
  static _signatureValidationCache = new SignatureValidationCache();

  // TODO(burdon): Relocate static methods.

  @meter
  static cryptoVerify (message: Buffer, signature: Buffer, publicKey: Buffer) {
    return cryptoVerify(message, signature, publicKey);
  }

  @meter
  static cryptoSign (message: Buffer, secretkey: Buffer) {
    return cryptoSign(message, secretkey);
  }

  /**
   * Sign the message with the indicated key or keys. The returned signed object will be of the form:
   * {
   *   signed: { ... }, // The message as signed, including timestamp and nonce.
   *   signatures: []   // An array with signature and publicKey of each signing key.
   * }
   */
  @meter
  static signMessage (message: any,
    keys: KeyRecord[],
    keyChainMap: Map<string, KeyChain>,
    nonce?: Buffer,
    created?: string): WithTypeUrl<SignedMessage> {
    assert(typeof message === 'object');
    for (const key of keys) {
      assertValidKeyPair(key);
    }

    if (!keyChainMap) {
      keyChainMap = new Map();
    }

    // If signing a string, wrap it in an object.
    if (typeof message === 'string') {
      message = { message };
    }

    // Check every key passed is suitable for signing.
    keys.forEach(keyRecord => assertValidKeyPair(keyRecord));

    const signed = {
      created: created || createDateTimeString(),
      nonce: nonce || randomBytes(32),
      payload: message
    };

    // Sign with each key, adding to the signatures list.
    const signatures: SignedMessage.Signature[] = [];
    const buffer = Buffer.from(canonicalStringify(signed));
    keys.forEach(({ publicKey, secretKey }) => {
      // TODO(burdon): Already tested above?
      assertValidSecretKey(secretKey);
      signatures.push({
        signature: this.cryptoSign(buffer, Buffer.from(secretKey)),
        key: publicKey,
        keyChain: keyChainMap.get(publicKey.toHex())
      });
    });

    return {
      '@type': 'dxos.halo.signed.SignedMessage',
      signed,
      signatures
    };
  }

  /**
   * Builds up a KeyChain for `publicKey` from the supplied SignedMessages. The message map should be indexed
   * by the hexlified PublicKeyLike. If a single message admits more than one key, it should have a map entry for each.
   * @param publicKey
   * @param signedMessageMap
   * @param exclude Keys which should be excluded from the chain, for example, excluding FEED keys when
   * building up a chain for a DEVICE.
   */
  @meter
  static buildKeyChain (publicKey: PublicKeyLike, signedMessageMap: Map<string, Message | SignedMessage>, exclude: PublicKey[] = []): KeyChain {
    publicKey = PublicKey.from(publicKey);

    const wrappedMessage = signedMessageMap.get(publicKey.toHex());
    assert(wrappedMessage, 'No such message.');
    const message = unwrapMessage(wrappedMessage);
    if (!message) {
      throw new Error('No such message.');
    }

    const chain: KeyChain = {
      publicKey,
      message,
      parents: []
    };

    if (!Keyring.validateSignatures(message)) {
      throw new Error('Invalid signature.');
    }

    const signedBy = Keyring.signingKeys(message);
    if (!signedBy.find(key => key.equals(publicKey))) {
      throw new Error('Message not signed by expected key.');
    }

    for (const signer of signedBy) {
      if (!signer.equals(publicKey) && !exclude.find(key => key.equals(signer))) {
        const parent = Keyring.buildKeyChain(signer, signedMessageMap, [...signedBy, ...exclude]);
        if (parent && parent.message !== message) {
          chain.parents!.push(parent);
        }
      }
    }

    return chain;
  }

  /**
   * What keys were used to sign this message?
   * @param message
   * @param deep Whether to check for nested messages.
   * @param validate Whether or not to validate the signatures.
   */
  @meter
  static signingKeys (message: Message | SignedMessage, { deep = true, validate = true } = {}): PublicKey[] {
    const all = new Set<string>();

    if (isSignedMessage(message)) {
      const { signed, signatures = [] } = message;
      for (const signature of signatures) {
        if (!validate || Keyring.validateSignature(signed, signature.signature, signature.key.asBuffer())) {
          all.add(PublicKey.from(signature.key).toHex());
        }
      }
    }

    if (deep) {
      for (const property of Object.getOwnPropertyNames(message)) {
        const value = (message as any)[property];
        if (typeof value === 'object') {
          const keys = Keyring.signingKeys(value, { deep, validate });
          for (const key of keys) {
            all.add(key.toHex());
          }
        }
      }
    }

    return Array.from(all).map(key => PublicKey.from(key));
  }

  /**
   * Validate all the signatures on a signed message.
   * This does not check that the keys are trusted, only that the signatures are valid.
   */
  @meter
  static validateSignatures (message: Message | SignedMessage): boolean {
    const unwrapped = unwrapMessage(message);
    assert(Array.isArray(unwrapped.signatures));

    const { signed, signatures } = unwrapped;

    for (const sig of signatures) {
      if (!Keyring.validateSignature(signed, sig.signature, sig.key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates a single signature on a message.
   * This does not check that the key is trusted, only that the signature is valid.
   */
  @meter
  static validateSignature (message: any, signature: RawSignature, key: PublicKeyLike): boolean { // eslint-disable-line class-methods-use-this
    assertValidPublicKey(key);
    assert(typeof message === 'object');

    let result = this._signatureValidationCache.get(message, signature, key);
    if (result === undefined) {
      const stringy = canonicalStringify(message);
      result = Keyring.cryptoVerify(Buffer.from(stringy), Buffer.from(signature), PublicKey.from(key).asBuffer());
      this._signatureValidationCache.set(message, signature, key, result);
    }

    return result;
  }

  /**
   * Creates a search filter for a key that can be used for signing.
   */
  @meter
  static signingFilter (attributes: Partial<KeyRecord> = {}) {
    return Filter.and(
      Filter.matches({
        ...attributes,
        own: true,
        trusted: true
      }),
      Filter.hasProperty('secretKey')
    );
  }

  private readonly _keystore: KeyStore;
  private readonly _keyCache = new Map<string, any>();
  private readonly _findTrustedCache = new Map<string, PublicKeyLike>();

  /**
   * Event that is called on all key changes with updated array of keys.
   */
  readonly keysUpdate = new Event<KeyRecord[]>();

  /**
   * If no KeyStore is supplied, in-memory key storage will be used.
   */
  constructor (keystore?: KeyStore) {
    this._keystore = keystore || new KeyStore(memdown());
  }

  /**
   * All keys as an array.
   */
  get keys (): KeyRecord[] {
    return this.findKeys();
  }

  /**
   * Load keys from the KeyStore.  This call is required when using a persistent KeyStore.
   */
  @meter
  async load () {
    const entries = await this._keystore.getRecordsWithKey();
    for (const entry of entries) {
      const [key, value] = entry;
      this._keyCache.set(key, value);
    }
    this.keysUpdate.emit(this.keys);

    return this;
  }

  /**
   * Delete every keyRecord. Safe to continue to use the object.
   */
  @meter
  async deleteAllKeyRecords () {
    this._keyCache.clear();
    const allKeys = await this._keystore.getKeys();
    const promises = [];
    for (const key of allKeys) {
      promises.push(this._keystore.deleteRecord(key));
    }
    // TODO(burdon): Is this how we do this?
    await Promise.all(promises);
    this.keysUpdate.emit(this.keys);
  }

  /**
   * Adds a keyRecord that must contain a key pair (publicKey/secretKey).
   * @returns A copy of the KeyRecord, without secrets.
   */
  @meter
  async addKeyRecord (keyRecord: Omit<KeyRecord, 'key'>) {
    assertValidKeyPair(keyRecord);

    return this._addKeyRecord(keyRecord);
  }

  /**
   * Adds the KeyRecord that must contain a publicKey but no secretKey.
   * @param {KeyRecord} keyRecord
   * @returns {KeyRecord} A copy of the KeyRecord.
   */
  @meter
  async addPublicKey (keyRecord: Omit<KeyRecord, 'key' | 'secretKey'>) {
    assertValidPublicKey(keyRecord.publicKey, keyRecord.type);
    assertNoSecrets(keyRecord);

    return this._addKeyRecord(keyRecord);
  }

  /**
   * Adds a KeyRecord to the keyring and stores it in the keystore.
   * The KeyRecord may contain a key pair, or only a public key.
   * @param keyRecord
   * @param [overwrite=false] Overwrite an existing key.
   * @returns A copy of the KeyRecord, minus secrets.
   * @private
   */
  async _addKeyRecord (keyRecord: Omit<KeyRecord, 'key'>, overwrite = false) {
    const copy = checkAndNormalizeKeyRecord(keyRecord);

    if (!overwrite) {
      if (this.hasKey(copy.publicKey)) {
        throw new Error('Refusing to overwrite existing key.');
      }
    }

    await this._keystore.setRecord(copy.publicKey.toHex(), copy);
    this._keyCache.set(copy.publicKey.toHex(), copy);
    this.keysUpdate.emit(this.keys);

    return stripSecrets(copy);
  }

  /**
   * Adds a temporary KeyRecord to the keyring.  The key is not stored to the KeyStore.
   * The KeyRecord may contain a key pair, or only a public key.
   * @param keyRecord
   * @param [overwrite=false] Overwrite an existing key.
   * @returns A copy of the KeyRecord, minus secrets.
   * @private
   */
  _addTempKeyRecord (keyRecord: Omit<KeyRecord, 'key'>, overwrite = false) {
    const copy = checkAndNormalizeKeyRecord(keyRecord);

    if (!overwrite) {
      if (this.hasKey(copy.publicKey)) {
        throw new Error('Refusing to overwrite existing key.');
      }
    }

    this._keyCache.set(copy.publicKey.toHex(), copy);
    this.keysUpdate.emit(this.keys);

    return stripSecrets(copy);
  }

  /**
   * Adds or updates a KeyRecord. The KeyRecord must contain a publicKey and it may contain a secretKey.
   * If the KeyRecord already exists, the secretKey will NOT be updated.
   * @param {KeyRecord} keyRecord
   * @returns {KeyRecord} A copy of the KeyRecord, without secrets.
   */
  @meter
  async updateKey (keyRecord: KeyRecord) {
    assert(keyRecord);
    assertValidPublicKey(keyRecord.publicKey, keyRecord.type);

    // Do not allow updating/changing secrets.
    const cleaned = stripSecrets(keyRecord);

    const existing = this.getFullKey(cleaned.publicKey);
    const updated = { ...existing, ...cleaned };

    // There is one special case, which is not to move from a more specific to a less specific key type.
    if (existing && existing.type !== KeyType.UNKNOWN && updated.type === KeyType.UNKNOWN) {
      updated.type = existing.type;
    }

    return this._addKeyRecord(updated, true);
  }

  /**
   * Deletes the secretKey from a stored KeyRecord.
   * @param keyRecord
   * @returns {Promise<void>}
   */
  @meter
  async deleteSecretKey (keyRecord: KeyRecord) {
    assert(keyRecord);
    assertValidPublicKey(keyRecord.publicKey, keyRecord.type);

    const existing = this.getFullKey(keyRecord.publicKey);
    if (existing) {
      const cleaned = stripSecrets(existing);
      await this._keystore.setRecord(cleaned.publicKey.toHex(), cleaned);
      this._keyCache.set(cleaned.publicKey.toHex(), cleaned);
      this.keysUpdate.emit(this.keys);
    }
  }

  /**
   * Returns true if the stored KeyRecord has a secretKey available.
   */
  @meter
  hasSecretKey (keyRecord: KeyRecord | KeyChain): boolean {
    assert(keyRecord);
    const { publicKey } = keyRecord;
    assertValidPublicKey(publicKey);

    const existing = this.getFullKey(publicKey);
    return existing ? Buffer.isBuffer(existing.secretKey) : false;
  }

  /**
   * Is the publicKey in the keyring?
   */
  @meter
  hasKey (publicKey: PublicKeyLike): boolean {
    assertValidPublicKey(publicKey);

    return !!this.getKey(publicKey);
  }

  /**
   * Tests if the given key is trusted.
   */
  @meter
  isTrusted (publicKey: PublicKeyLike): boolean {
    assertValidPublicKey(publicKey);

    return this.getKey(publicKey)?.trusted ?? false;
  }

  /**
   * Return the keyRecord from the keyring, if present.
   */
  getFullKey (publicKey: PublicKeyLike): KeyRecord | undefined {
    assertValidPublicKey(publicKey);
    publicKey = PublicKey.from(publicKey);

    return this._findFullKey(Filter.hasKey('publicKey', publicKey));
  }

  /**
   * Return the keyRecord from the keyring, if present.
   * Secret key is removed from the returned version of the KeyRecord.
   *
   * @returns KeyRecord, without secretKey
   */
  @meter
  getKey (publicKey: PublicKeyLike): KeyRecord | undefined {
    assertValidPublicKey(publicKey);

    const key = this.getFullKey(publicKey);
    return key ? stripSecrets(key) : undefined;
  }

  /**
   * Find all keys matching the indicated criteria: 'key', 'type', 'own', etc.
   */
  private _findFullKeys (...filters: FilterFunction[]): KeyRecord[] {
    return Filter.filter(this._keyCache.values(), Filter.and(...filters));
  }

  /**
   * Find all keys matching the indicated criteria: 'key', 'type', 'own', etc.
   * Secret keys are removed from the returned version of the KeyRecords.
   * @param filters
   * @returns {KeyRecord[]} KeyRecords, without secretKeys
   */
  @meter
  findKeys (...filters: FilterFunction[]): KeyRecord[] {
    return this._findFullKeys(...filters).map(stripSecrets);
  }

  /**
   * Find one key matching the indicated criteria: 'party', 'type', etc.
   */
  private _findFullKey (...filters: FilterFunction[]): KeyRecord | undefined {
    const matches = this._findFullKeys(...filters);
    if (matches.length > 1) {
      throw new Error(`Expected <= 1 matching keys; found ${matches.length}.`);
    }
    return matches.length ? matches[0] : undefined;
  }

  /**
   * Find one key matching the indicated criteria: 'party', 'type', etc.
   * Secret key is removed from the returned version of the KeyRecord.
   * @returns KeyRecord, without secretKey
   */
  @meter
  findKey (...filters: FilterFunction[]) {
    const key = this._findFullKey(...filters);
    return key ? stripSecrets(key) : undefined;
  }

  /**
   * Serialize the Keyring contents to JSON.
   */
  @meter
  toJSON () {
    const keys = this._findFullKeys().map((key) => {
      const copy = { ...key } as any;
      if (copy.publicKey) {
        copy.publicKey = copy.publicKey.toHex();
      }
      if (copy.secretKey) {
        copy.secretKey = copy.secretKey.toString('hex');
      }

      return copy;
    });

    return canonicalStringify({
      '@type': 'dxos.halo.credentials.keys.KeyRecordList',
      keys
    });
  }

  /**
   * Load keys from supplied JSON into the Keyring.
   * @param {string} value
   */
  @meter
  async loadJSON (value: string) {
    const parsed = JSON.parse(value);

    return Promise.all(parsed.keys.map((item: any) => {
      if (item.publicKey) {
        item.publicKey = PublicKey.from(item.publicKey);
      }
      if (item.secretKey) {
        item.secretKey = PublicKey.bufferize(item.secretKey);
      }

      if (item.secretKey) {
        return this.addKeyRecord(item);
      } else {
        return this.addPublicKey(item);
      }
    }));
  }

  /**
   * Export the Keyring contents.
   */
  // Has to be in quotes: https://github.com/Brooooooklyn/swc-node/issues/636.
  @meter
  ['export'] () {
    return { keys: this._findFullKeys() };
  }

  /**
   * Import KeyRecords into the KeyRing.
   * @param records
   */
  @meter
  async import (records: KeyRecordList) {
    const { keys = [] } = records;
    for (const keyRecord of keys) {
      if (keyRecord.secretKey) {
        await this.addKeyRecord(keyRecord);
      } else {
        await this.addPublicKey(keyRecord);
      }
    }
  }

  /**
   * Creates a new public/private key pair and stores in a new KeyRecord with the supplied attributes.
   * Secret key is removed from the returned version of the KeyRecord.
   * @param {Object} attributes - see KeyRecord definition for valid attributes.
   * @return {Promise<KeyRecord>} New KeyRecord, without secretKey
   */
  @meter
  async createKeyRecord (attributes = {}): Promise<KeyRecord> {
    assert(arguments.length <= 1);
    const keyRecord = createKeyRecord(attributes);
    await this.addKeyRecord(keyRecord as KeyRecord & KeyPair);
    return stripSecrets(keyRecord);
  }

  /**
   * Sign the message with the indicated key or keys. The returned signed object will be of the form:
   * {
   *   signed: { ... }, // The message as signed, including timestamp and nonce.
   *   signatures: []   // An array with signature and publicKey of each signing key.
   * }
   */
  @meter
  sign (message: any, keys: (KeyRecord | KeyChain | PublicKey)[], nonce?: Buffer, created?: string) {
    assert(typeof message === 'object');
    assert(keys);
    assert(Array.isArray(keys));

    const chains = new Map();
    const fullKeys: KeyRecord[] = [];
    keys.forEach((key) => {
      const fullKey = this.getFullKey(key instanceof PublicKey ? key : key.publicKey);
      assert(fullKey);
      assertValidKeyPair(fullKey);
      fullKeys.push(fullKey);
      if (isKeyChain(key)) {
        chains.set(fullKey.publicKey.toHex(), key);
      }
    });

    return Keyring.signMessage(message, fullKeys, chains, nonce, created);
  }

  /**
   * Sign the data with the indicated key and return the signature.
   * KeyChains are not supported.
   */
  @meter
  rawSign (data: Buffer, keyRecord: KeyRecord) {
    assert(Buffer.isBuffer(data), 'Data to sign is not a buffer.');
    assert(keyRecord);
    assertValidPublicKey(keyRecord.publicKey);
    assertNoSecrets(keyRecord);

    const fullKey = this.getFullKey(keyRecord.publicKey) as KeyRecord;
    assertValidKeyPair(fullKey);

    return Keyring.cryptoSign(data, fullKey.secretKey);
  }

  /**
   * Verify all the signatures on a signed message.
   * By default, at least ONE of the signing keys must be a known, trusted key.
   * If `requireAllKeysBeTrusted` is true, ALL keys must be known and trusted.
   * @param {SignedMessage} message
   * @param {object} options
   * @returns {boolean}
   */
  @meter
  verify (message: SignedMessage, { requireAllKeysBeTrusted = false, allowKeyChains = true } = {}) {
    assert(typeof message === 'object');
    assert(message.signed);
    assert(Array.isArray(message.signatures));

    if (!Keyring.validateSignatures(message)) {
      return false;
    }

    let trustedSignatures = 0;
    const { signatures } = message;
    for (const signatureInformation of signatures) {
      const { key, keyChain } = signatureInformation;

      const keyRecord = this.getKey(key);
      if (keyRecord && keyRecord.trusted) {
        // The simple case is that we already trust this key.
        trustedSignatures++;
      } else if (allowKeyChains && keyChain) {
        // The more complicated case is that we trust a key in its certification chain.
        const trustedKey = this.findTrusted(keyChain);
        if (trustedKey) {
          trustedSignatures++;
        }
      }
    }

    return requireAllKeysBeTrusted ? trustedSignatures === signatures.length : trustedSignatures >= 1;
  }

  /**
   * Find the first trusted key in the KeyChain, working from tip to root. For example, if the KeyChain has
   * keys: D->C->B->A and the Keyring trusted D, that would be returned. But if it did not trust D, but did trust
   * C, then C would, and so forth back to the root (A).
   * @param {KeyChain} chain
   * @return {Promise<KeyRecord>}
   */
  @meter
  findTrusted (chain: KeyChain) {
    const cached = this._findTrustedCache.get(chain.publicKey.toHex());
    if (cached && this.hasKey(cached)) {
      return this.getKey(cached);
    }

    // `messages` contains internal state, and should not be passed in from outside.
    const messages: SignedMessage[] = [];

    const walkChain = (chain: KeyChain): KeyRecord | undefined => {
      const signingKeys = Keyring.signingKeys(chain.message, { validate: false });
      // Check that the message is truly signed by the indicated key.
      if (!signingKeys.find(key => key.equals(chain.publicKey))) {
        throw new Error('Message not signed by indicated key.');
      }
      messages.push(chain.message);

      const knownKey = this.hasKey(chain.publicKey) ? chain.publicKey : signingKeys.find(key => this.hasKey(key));

      // Do we have the key?
      if (knownKey) {
        const key = this.getKey(knownKey)!;
        // If we do, but don't trust it, that is very bad.
        if (!key.trusted) {
          throw new Error('Untrusted key found in chain.');
        }
        // At this point, we should be able to verify the message with our true keyring.
        // If the key is directly trusted, then we are done.
        if (messages.length === 1) {
          if (this.verify(messages[0])) {
            return key;
          }
          throw new Error('Unable to verify message, though key is trusted.');
        } else {
          // Otherwise we need to make sure the messages form a valid hierarchy, starting from the trusted key.
          messages.reverse();
          const tmpKeys = new Keyring();
          tmpKeys._addTempKeyRecord(key);

          /* Starting from the message containing the trusted key, add the signing keys and walk forward
           * until we reach the end.
           */
          for (const message of messages) {
            // Verification will fail if the message is not signed by an already trusted key.
            const verified = tmpKeys.verify(message);
            if (!verified) {
              throw new Error('Unable to verify message in chain');
            }

            // Add the signing keys to the trust.
            // TODO(telackey): Filter by those keys actually in the hierarchy.
            for (const key of Keyring.signingKeys(message)) {
              if (!tmpKeys.hasKey(key)) {
                const tmpKey = createKeyRecord({}, { publicKey: key.asBuffer() });
                tmpKeys._addTempKeyRecord(tmpKey);
              }
            }
          }

          // If all of the above checks out, we have the right key.
          return key;
        }
      } else if (Array.isArray(chain.parents)) {
        for (const parent of chain.parents) {
          const trusted = walkChain(parent);
          if (trusted) {
            return trusted;
          }
        }
      }

      return undefined;
    };

    const trusted = walkChain(chain);
    if (trusted) {
      this._findTrustedCache.set(chain.publicKey.toHex(), trusted.publicKey);
    }
    return trusted;
  }

  /**
   * Application-wide Keyring metrics.
   */
  metrics () {
    return { keyring: metrics, sigCache: cacheMetrics };
  }
}
