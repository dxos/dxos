//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import HumanHasher from 'humanhash';
// TODO(wittjosiah): node webcrypto types
import { webcrypto as crypto } from 'crypto';

// @ts-ignore TODO
const { subtle, CryptoKey } = crypto;

import { PublicKey, PublicKeyLike } from './public-key';

export const hasher = new HumanHasher();

export const PUBLIC_KEY_LENGTH = 97;
export const KEY_GENERATION_ALGORITHM = {
  name: 'ECDSA',
  namedCurve: 'P-384'
};
export const SIGNATURE_LENGTH = 96;
export const SIGNATURE_ALGORITHM = {
  name: 'ECDSA',
  hash: {name: 'SHA-384'},
};

export const zeroKey = () => new Uint8Array(32);

//
// The purpose of this module is to assure consistent use of keys throughout the project.
// NOTE: keys should be maintained as CryptoKeys in objects and proto definitions, and converted to hex
// strings as late as possible (e.g., to log/display).
//

export interface KeySeed {
  publicKey: Buffer | JsonWebKey,
  privateKey: JsonWebKey
}

export const createKeyPair = async (seed?: KeySeed): Promise<CryptoKeyPair> => {
  if (seed) {
    const publicKey = await subtle.importKey(
      typeof Buffer.isBuffer(seed.publicKey) ? 'raw' : 'jwk',
      seed.publicKey,
      KEY_GENERATION_ALGORITHM,
      true,
      ["verify"]
    );

    const privateKey = await subtle.importKey(
      'jwk',
      seed.privateKey,
      KEY_GENERATION_ALGORITHM,
      true,
      ["sign"]
    );

    return { publicKey, privateKey };
  }

  return subtle.generateKey(KEY_GENERATION_ALGORITHM, true, ["sign", "verify"]);
}

export const discoveryKey = async (key: PublicKeyLike): Promise<Buffer> => {
  // TODO
  return Buffer.from('todo');
}

/**
 * @param {CryptoKey} key - Key instance.
 * @return {Promise<JsonWebKey>} WebKey object.
 */
export async function keyToJson (key: CryptoKey): Promise<JsonWebKey> {
  return subtle.exportKey('jwk', key);
}

/**
 * @param {string} str - Hex string representation of key.
 * @return {Buffer} Key buffer.
 */
export function keyToBuffer (str: string): Buffer {
  assert(typeof str === 'string', 'Invalid type');
  const buffer = Buffer.from(str, 'hex');
  assert(buffer.length === PUBLIC_KEY_LENGTH, `Invalid key length: ${buffer.length}`);
  return buffer;
}

/**
 * @param {CryptoKey} key - Key instance.
 * @return {Promise<string>} Hex string representation of key.
 */
export async function keyToString (key: CryptoKey): Promise<string> {
  assert(key instanceof CryptoKey, 'Invalid type');

  const rawKey = await subtle.exportKey('raw', key);
  const buffer = Buffer.from(rawKey);
  return _keyToString(buffer);
}

/**
 * @param {Buffer | Uint8Array} buffer - Key buffer.
 * @return {string} Hex string representation of key.
 */
function _keyToString (buffer: Buffer | Uint8Array): string {
  if (buffer instanceof Uint8Array) {
    buffer = Buffer.from(buffer);
  }

  assert(buffer instanceof Buffer, 'Invalid type');
  return buffer.toString('hex');
}

export async function humanize (value: CryptoKey | string): Promise<string> {
  if (value instanceof CryptoKey) {
    value = await keyToString(value as CryptoKey);
  }

  return hasher.humanize(value);
}

/**
 * Return random bytes of length.
 * @param [length=32]
 * @return {Buffer}
 */
export function randomBytes (length = 32): Buffer {
  const buffer = Buffer.allocUnsafe(length);
  // @ts-ignore TODO
  crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * @return {string}
 */
export function createId (): string {
  return _keyToString(randomBytes(32));
}

/**
 * Sign the contents of message with secretKey
 * @param {Buffer} message
 * @param {Buffer} secretKey
 * @return {Promise<Buffer>} signature
 */
export async function sign (message: Buffer, secretKey: CryptoKey): Promise<Buffer> {
  assert(Buffer.isBuffer(message));

  return subtle.sign(SIGNATURE_ALGORITHM, secretKey, message);
}

/**
 * Verifies the signature against the message and publicKey.
 * @param {Buffer} message
 * @param {Buffer} publicKey
 * @param {Buffer} signature
 * @return {Promise<boolean>}
 */
export async function verify (message: Buffer, signature: Buffer, publicKey: CryptoKey): Promise<boolean> {
  assert(Buffer.isBuffer(message));

  return subtle.verify(SIGNATURE_ALGORITHM, publicKey, signature, message);
}
