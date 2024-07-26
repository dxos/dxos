//
// Copyright 2020 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type KeyPair, PublicKey, type PublicKeyLike, PUBLIC_KEY_LENGTH, SECRET_KEY_LENGTH } from '@dxos/keys';

import crypto from '#hypercore-crypto';

export const SIGNATURE_LENGTH = 64;

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const createId = (): string => PublicKey.stringify(randomBytes(32));

export const createKeyPair = (seed?: Buffer): KeyPair => {
  if (seed) {
    invariant(seed.length >= 32, 'Seedphrase too sort. Expecting length of 32.');
    return crypto.keyPair(seed.slice(0, 32));
  }

  // TODO(burdon): Enable seed for debugging.
  return crypto.keyPair();
};

// TODO(burdon): Buffer.
export const validateKeyPair = (publicKey: PublicKey, secretKey: Buffer) =>
  crypto.validateKeyPair({ publicKey: publicKey.asBuffer(), secretKey });

// TODO(dmaretskyi): Slicing because webcrypto keys are too long.
export const discoveryKey = (key: PublicKeyLike): Buffer =>
  crypto.discoveryKey(PublicKey.from(key).asBuffer().slice(1));

/**
 * Return random bytes of length.
 * @param [length=32]
 * @return {Buffer}
 */
export const randomBytes = (length = 32): Buffer => crypto.randomBytes(length);

/**
 * Sign the contents of message with secret_key
 * @param {Buffer} message
 * @param {Buffer} secretKey
 * @returns {Buffer} signature
 */
export const sign = (message: Buffer, secretKey: Buffer): Buffer => {
  invariant(Buffer.isBuffer(message));
  invariant(Buffer.isBuffer(secretKey) && secretKey.length === SECRET_KEY_LENGTH);

  return crypto.sign(message, secretKey);
};

/**
 * Verifies the signature against the message and public_key.
 * @param {Buffer} message
 * @param {Buffer} publicKey
 * @param {Buffer} signature
 * @return {boolean}
 */
export const verify = (message: Buffer, signature: Buffer, publicKey: Buffer): boolean => {
  invariant(Buffer.isBuffer(message));
  invariant(Buffer.isBuffer(signature) && signature.length === SIGNATURE_LENGTH);
  invariant(Buffer.isBuffer(publicKey) && publicKey.length === PUBLIC_KEY_LENGTH);

  return crypto.verify(message, signature, publicKey);
};
