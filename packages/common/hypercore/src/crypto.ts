//
// Copyright 2022 DXOS.org
//

import { callbackify } from 'node:util';

import { type AbstractValueEncoding, type Crypto } from 'hypercore';

import { type Codec, type EncodingOptions } from '@dxos/codec-protobuf';
import crypto from '#hypercore-crypto';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { arrayToBuffer } from '@dxos/util';
import { type KeyPair } from '@dxos/keys';

/**
 * Create encoding (e.g., from protobuf codec).
 */
export const createCodecEncoding = <T>(codec: Codec<T>, opts?: EncodingOptions): AbstractValueEncoding<T> => ({
  encode: (obj: T) => arrayToBuffer(codec.encode(obj, opts)),
  decode: (buffer: Buffer) => codec.decode(buffer, opts),
});

/**
 * Create a custom hypercore crypto signer.
 */
// TODO(burdon): Create test without adding deps.
export const createCrypto = (signer: Signer, publicKey: PublicKey): Crypto => {
  invariant(signer);
  invariant(publicKey);

  return {
    sign: (message, secretKey, cb) => {
      callbackify(signer.sign.bind(signer!))(publicKey, message, (err, result) => {
        if (err) {
          cb(err, null);
          return;
        }

        cb(null, arrayToBuffer(result));
      });
    },

    verify: async (message, signature, key, cb) => {
      // NOTE: Uses the public key passed into function.
      callbackify(verifySignature)(publicKey, message, signature, cb);
    },
  };
};

/**
 *
 */
export interface Signer {
  /**
   * Sign a message with the given key.
   * Key must be present in the keyring.
   */
  sign: (key: PublicKey, message: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Verify a signature with the given key.
 */
export const verifySignature = async (
  key: PublicKey,
  message: Uint8Array,
  signature: Uint8Array,
  algorithm: { name: string; namedCurve?: string } = { name: 'ECDSA', namedCurve: 'P-256' },
): Promise<boolean> => {
  let publicKey!: CryptoKey;

  try {
    publicKey = await crypto.subtle.importKey('raw', key.asUint8Array() as Uint8Array<ArrayBuffer>, algorithm, true, [
      'verify',
    ]);
  } catch {
    return false;
  }

  return crypto.subtle.verify(
    {
      name: algorithm.name,
      hash: 'SHA-256',
    },
    publicKey,
    signature as Uint8Array<ArrayBuffer>,
    message as Uint8Array<ArrayBuffer>,
  );
};

export const createKeyPair = (seed?: Buffer): KeyPair => {
  if (seed) {
    invariant(seed.length >= 32, 'Seedphrase too sort. Expecting length of 32.');
    return crypto.keyPair(seed.slice(0, 32));
  }

  // TODO(burdon): Enable seed for debugging.
  return crypto.keyPair();
};
