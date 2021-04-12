//
// Copyright 2020 DXOS.org
//

//
// IMPORTANT: The contents of this file are utilities/helper functions used exclusively by Keyring.
// The functions are NOT EXPORTED outside of this package.
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';
import performanceNow from 'performance-now';

import { createKeyPair, KeyPair, PublicKey, PublicKeyLike } from '@dxos/crypto';

import { KeyChain, KeyRecord, KeyType, SignedMessage } from '../proto';
import { createDateTimeString } from '../proto/datetime';
import { MakeOptional } from '../typedefs';
import { SecretKey } from './keytype';

/**
 * Checks for a valid publicKey Buffer.
 */
export function isValidPublicKey (key: PublicKeyLike): key is PublicKeyLike {
  try {
    PublicKey.from(key);
    return true;
  } catch (e) {
  }
  return false;
}

/**
 * Checks for a valid publicKey Buffer.
 */
export function assertValidPublicKey (key: PublicKeyLike): asserts key is PublicKeyLike {
  assert(key);
  assert(isValidPublicKey(key));
}

/**
 * Checks for a valid secretKey Buffer.
 */
export function assertValidSecretKey (key?: SecretKey): asserts key is SecretKey {
  assert(key && key.length === 64);
}

/**
 * Checks for a valid publicKey/secretKey KeyPair.
 */
// TODO(burdon): This should only happen in tests.
export function assertValidKeyPair (keyRecord: any): asserts keyRecord is KeyPair {
  const { publicKey, secretKey } = keyRecord;
  assertValidPublicKey(publicKey);
  assertValidSecretKey(secretKey);
}

/**
 * Checks that the KeyRecord contains no secrets (ie, secretKey and seedPhrase).
 */
export const assertNoSecrets = (keyRecord: Omit<KeyRecord, 'key'>) => {
  assert(keyRecord);
  // TODO(marik-d): Check if booleans are used anywhere.
  // TODO(marik-d): Check if seed phrase is stored in key records.
  assert(!keyRecord.secretKey || (keyRecord.secretKey as any) === true);
  assert(!(keyRecord as any).seedPhrase || ((keyRecord as any).seedPhrase as any) === true);
};

/**
 * Obscures the value of secretKey and seedPhrase with a boolean.
 */
export const stripSecrets = (keyRecord: KeyRecord): KeyRecord => {
  assert(keyRecord);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretKey, seedPhrase, ...stripped } = keyRecord as any;
  return stripped;
};

// TODO(burdon): Define protocol buffer.
const ALLOWED_FIELDS = [
  'type', 'key', 'publicKey', 'secretKey', 'hint', 'own', 'trusted', 'added', 'created'
];

/**
 * Checks that there are no unknown attributes on the KeyRecord.
 */
export const assertValidAttributes = (keyRecord: Partial<KeyRecord>) => {
  Object.keys(keyRecord).forEach(key => {
    assert(ALLOWED_FIELDS.find(k => k === key));
  });
};

/**
 * Create a new KeyRecord with the indicated attributes.
 * @param attributes Valid attributes above.
 * @param keyPair If undefined then a public/private key pair will be generated.
 */
export const createKeyRecord = (attributes: Partial<KeyRecord> = {},
  keyPair: MakeOptional<KeyPair, 'secretKey'> = createKeyPair()): KeyRecord => {
  const { publicKey: rawPublicKey, secretKey } = keyPair;
  const publicKey = PublicKey.from(rawPublicKey);

  // Disallow invalid attributes.
  assertValidAttributes(attributes);

  return {
    type: KeyType.UNKNOWN,
    hint: false,
    own: !!secretKey,
    trusted: true,
    created: createDateTimeString(),

    // Overrides the defaults above.
    ...attributes,

    publicKey,
    secretKey
  };
};

/**
 * Utility method to produce stable output for signing/verifying.
 */
export const canonicalStringify = (obj: any) => {
  return stableStringify(obj, {
    // The point of signing and verifying is not that the internal, private state of the objects be
    // identical, but that the public contents can be verified not to have been altered. For that reason,
    // really private fields (indicated by '__') are not included in the signature. In practice, this skips __type_url,
    // and it also gives a mechanism for attaching other attributes to an object without breaking the signature.
    replacer: (key: any, value: any) => {
      if (key.toString().startsWith('__')) {
        return undefined;
      }
      if (value) {
        if (PublicKey.isPublicKey(value)) {
          return value.toHex();
        }
        if (Buffer.isBuffer(value)) {
          return value.toString('hex');
        }
        if (value instanceof Uint8Array || (value.data && value.type === 'Buffer')) {
          return Buffer.from(value).toString('hex');
        }
      }
      return value;
    }
  });
};

/**
 * Is object `key` a KeyChain?
 */
export const isKeyChain = (key: any = {}): key is KeyChain => {
  return isValidPublicKey(key.publicKey) && key.message && key.message.signed && Array.isArray(key.message.signatures);
};

/**
 * Is object `message` a SignedMessage?
 */
export const isSignedMessage = (message: any = {}): message is SignedMessage => {
  if (!message || typeof message !== 'object') {
    return false;
  }
  const { signed, signatures } = message;
  return signed && signatures && Array.isArray(signatures);
};

/**
 * Checks conformity and normalizes the KeyRecord. (Used before storing, so that only well-formed records are stored.)
 * @return A normalized copy of keyRecord.
 */
export const checkAndNormalizeKeyRecord = (keyRecord: Omit<KeyRecord, 'key'>) => {
  assert(keyRecord);
  assertValidAttributes(keyRecord);

  const { publicKey, secretKey, ...rest } = keyRecord;
  assertValidPublicKey(publicKey);
  if (secretKey) {
    assertValidSecretKey(secretKey);
  }

  return createKeyRecord({
    added: createDateTimeString(),
    ...rest
  },
  {
    publicKey: PublicKey.from(publicKey).asBuffer(),
    secretKey: secretKey ? Buffer.from(secretKey) : undefined
  });
};

/**
 * Unwraps (if necessary) a Message to its SignedMessage contents
 */
export const unwrapMessage = (message: any): SignedMessage => {
  if (message && message.payload && !message.signed && !Array.isArray(message.signatures)) {
    return message.payload;
  }
  return message;
};

/**
 * A simple class for keeping track of invocations and processing time.
 */
export class SimpleMetrics {
  private readonly _created = performanceNow();
  private readonly _counts = new Map<string, number>();
  private readonly _times = new Map<string, number>();

  inc (title: string) {
    let value = this._counts.get(title) ?? 0;
    this._counts.set(title, ++value);
    return value;
  }

  time (title: string) {
    const start = performanceNow();
    this.inc(title);
    return () => {
      const stop = performanceNow() - start;
      const value = this._times.get(title) ?? 0;
      this._times.set(title, value + stop);
      return stop;
    };
  }

  toString () {
    const counts = Array.from(this._counts.entries());
    counts.sort((a, b) => a[1] - b[1]);
    const countsStr = counts.map(([k, v]) => `${k}: ${v}`).join('\n ');

    const times = Array.from(this._times.entries());
    times.sort((a, b) => a[1] - b[1]);
    const timesStr = times.map(([k, v]) => `${k}: ${v.toFixed(2)}`).join('\n ');

    const elapsed = performanceNow() - this._created;

    return `COUNTS:\n ${countsStr}\n\nTIME (ms):\n ${timesStr}\n\nELAPSED (ms): ${elapsed.toFixed(2)}`;
  }
}

/**
 * A decorator for collecting metrics on methods.
 * @param metrics
 */
export const createMeter = (metrics: SimpleMetrics) => {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      const stop = metrics.time(method.name);
      const result = method.apply(this, args);
      if (!result || !result.finally) {
        stop();
        return result;
      } else {
        return result.finally(stop);
      }
    };
  };
};
