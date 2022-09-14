//
// Copyright 2020 DXOS.org
//

import crypto from 'hypercore-crypto';
import assert from 'node:assert';

import { PublicKey, PublicKeyLike, PUBLIC_KEY_LENGTH, SECRET_KEY_LENGTH } from '@dxos/protocols';

export const SIGNATURE_LENGTH = 64;

export const zeroKey = () => new Uint8Array(32);

export interface KeyPair {
  publicKey: Buffer
  secretKey: Buffer
}

export const createKeyPair = (seed?: Buffer): KeyPair => {
  if (seed) {
    assert(seed.length >= 32, 'Seedphrase too sort. Expecting length of 32.');
    return crypto.keyPair(seed.slice(0, 32));
  }

  return crypto.keyPair();
};

export const validateKeyPair = (publicKey: PublicKey, secretKey: Buffer) => crypto.validateKeyPair({ publicKey, secretKey });

export const discoveryKey = (key: PublicKeyLike): Buffer => crypto.discoveryKey(PublicKey.from(key).asBuffer().slice(1)); // TODO(dmaretskyi): Slicing because webcrypto keys are too long.

/**
 * Return random bytes of length.
 * @param [length=32]
 * @return {Buffer}
 */
export const randomBytes = (length = 32): Buffer => crypto.randomBytes(length);

/**
 * @return {string}
 */
// TODO(wittjosiah): This probably shouldn't rely on PublicKey?
export const createId = (): string => PublicKey.stringify(randomBytes(32));

/**
 * Sign the contents of message with secretKey
 * @param {Buffer} message
 * @param {Buffer} secretKey
 * @returns {Buffer} signature
 */
export const sign = (message: Buffer, secretKey: Buffer): Buffer => {
  assert(Buffer.isBuffer(message));
  assert(Buffer.isBuffer(secretKey) && secretKey.length === SECRET_KEY_LENGTH);

  return crypto.sign(message, secretKey);
};

/**
 * Verifies the signature against the message and publicKey.
 * @param {Buffer} message
 * @param {Buffer} publicKey
 * @param {Buffer} signature
 * @return {boolean}
 */
export const verify = (message: Buffer, signature: Buffer, publicKey: Buffer): boolean => {
  assert(Buffer.isBuffer(message));
  assert(Buffer.isBuffer(signature) && signature.length === SIGNATURE_LENGTH);
  assert(Buffer.isBuffer(publicKey) && publicKey.length === PUBLIC_KEY_LENGTH);

  return crypto.verify(message, signature, publicKey);
};
