//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import crypto from 'hypercore-crypto';

import { PublicKey, PublicKeyLike } from '@dxos/protocols';

import { HumanHasher } from './human-hash';

export const hasher = new HumanHasher();

export const PUBLIC_KEY_LENGTH = 32; // TODO(wittjosiah): Move to protocols with PublicKey?
export const SECRET_KEY_LENGTH = 64;
export const SIGNATURE_LENGTH = 64;

export const zeroKey = () => new Uint8Array(32);

/* The purpose of this module is to assure consistent use of keys throughout the project.
 * Keys should be maintained as buffers in objects and proto definitions, and converted to hex
 * strings as late as possible (eg, to log/display).
 */

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

export const discoveryKey = (key: PublicKeyLike): Buffer => crypto.discoveryKey(PublicKey.from(key).asBuffer());

/**
 * @param {string} str - Hex string representation of key.
 * @return {Buffer} Key buffer.
 */
export const keyToBuffer = (str: string): Buffer => {
  assert(typeof str === 'string', 'Invalid type');
  const buffer = Buffer.from(str, 'hex');
  assert(buffer.length === PUBLIC_KEY_LENGTH || buffer.length === SECRET_KEY_LENGTH,
    `Invalid key length: ${buffer.length}`);
  return buffer;
};

/**
 * @param {Buffer | Uint8Array} buffer - Key buffer.
 * @return {string} Hex string representation of key.
 */
export const keyToString = (buffer: PublicKeyLike): string => {
  if (buffer instanceof PublicKey) {
    buffer = buffer.asBuffer();
  } else if (buffer instanceof Uint8Array) {
    buffer = Buffer.from(buffer);
  }

  assert(buffer instanceof Buffer, 'Invalid type');
  return buffer.toString('hex');
};

export const humanize = (value: PublicKeyLike): string => {
  if (value instanceof PublicKey || value instanceof Buffer || value instanceof Uint8Array) {
    value = keyToString(value);
  }

  return hasher.humanize(value);
};

/**
 * Return random bytes of length.
 * @param [length=32]
 * @return {Buffer}
 */
export const randomBytes = (length = 32): Buffer => crypto.randomBytes(length);

/**
 * @return {string}
 */
export const createId = (): string => keyToString(randomBytes(32));

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
