//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import HumanHasher from 'humanhash';
import crypto from 'hypercore-crypto';

import { PublicKey, PublicKeyLike } from './public-key';

export const hasher = new HumanHasher();

export const PUBLIC_KEY_LENGTH = 32;
export const SECRET_KEY_LENGTH = 64;
export const SIGNATURE_LENGTH = 64;

export const zeroKey = () => new Uint8Array(32);

//
// The purpose of this module is to assure consistent use of keys throughout the project.
// NOTE: keys should be maintained as buffers in objects and proto definitions, and converted to hex
// strings as late as possible (e.g., to log/display).
//

export interface KeyPair {
  publicKey: Buffer
  secretKey: Buffer
}

export const createKeyPair = (seed?: Buffer): KeyPair => crypto.keyPair(seed);

export const discoveryKey = (key: PublicKeyLike): Buffer => crypto.discoveryKey(PublicKey.from(key).asBuffer());

/**
 * @param {string} str - Hex string representation of key.
 * @return {Buffer} Key buffer.
 */
export function keyToBuffer (str: string): Buffer {
  assert(typeof str === 'string', 'Invalid type');
  const buffer = Buffer.from(str, 'hex');
  assert(buffer.length === PUBLIC_KEY_LENGTH || buffer.length === SECRET_KEY_LENGTH,
    `Invalid key length: ${buffer.length}`);
  return buffer;
}

/**
 * @param {Buffer | Uint8Array} buffer - Key buffer.
 * @return {string} Hex string representation of key.
 */
export function keyToString (buffer: Buffer | Uint8Array): string {
  if (buffer instanceof Uint8Array) {
    buffer = Buffer.from(buffer);
  }

  assert(buffer instanceof Buffer, 'Invalid type');
  return buffer.toString('hex');
}

export function humanize (value: Buffer | Uint8Array | string): string {
  if (value instanceof Buffer || value instanceof Uint8Array) {
    value = keyToString(value);
  }

  return hasher.humanize(value);
}

/**
 * Return random bytes of length.
 * @param [length=32]
 * @return {Buffer}
 */
export function randomBytes (length = 32): Buffer {
  return crypto.randomBytes(length);
}

/**
 * @return {string}
 */
export function createId (): string {
  return keyToString(randomBytes(32));
}

/**
 * Sign the contents of message with secretKey
 * @param {Buffer} message
 * @param {Buffer} secretKey
 * @returns {Buffer} signature
 */
export function sign (message: Buffer, secretKey: Buffer): Buffer {
  assert(Buffer.isBuffer(message));
  assert(Buffer.isBuffer(secretKey) && secretKey.length === SECRET_KEY_LENGTH);

  return crypto.sign(message, secretKey);
}

/**
 * Verifies the signature against the message and publicKey.
 * @param {Buffer} message
 * @param {Buffer} publicKey
 * @param {Buffer} signature
 * @return {boolean}
 */
export function verify (message: Buffer, signature: Buffer, publicKey: Buffer): boolean {
  assert(Buffer.isBuffer(message));
  assert(Buffer.isBuffer(signature) && signature.length === SIGNATURE_LENGTH);
  assert(Buffer.isBuffer(publicKey) && publicKey.length === PUBLIC_KEY_LENGTH);

  return crypto.verify(message, signature, publicKey);
}
