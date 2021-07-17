//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import CryptoJS from 'crypto-js';

// TODO(wittjosiah): node webcrypto types
import { webcrypto as crypto } from 'crypto';

// @ts-ignore TODO
const { subtle } = crypto;

/**
 *
 * @param algorithm
 * @param plaintext
 * @returns {Promise<string>}
 * @private
 */
const _hash = async (algorithm: string, plaintext: string) => {
  assert(typeof algorithm === 'string');
  assert(typeof plaintext === 'string');

  if (algorithm === 'RIPEMD160') {
    return CryptoJS[algorithm](plaintext).toString();
  } else {
    const hash = await subtle.digest(algorithm, plaintext);
    const buffer = Buffer.from(hash)
    return buffer.toString('hex');
  }
};

/**
 * Creates a SHA-1 hash of the supplied string, returned as a hexadecimal string.
 * @param {string} text
 * @returns {Promise<string>}
 */
export const sha1 = async (text: string) => _hash('SHA-1', text);

/**
 * Creates a SHA-256 hash of the supplied string, returned as a hexadecimal string.
 * @param {string} text
 * @returns {Promise<string>}
 */
export const sha256 = async (text: string) => _hash('SHA-256', text);

/**
 * Creates a SHA-512 hash of the supplied string, returned as a hexadecimal string.
 * @param {string} text
 * @returns {Promise<string>}
 */
export const sha512 = async (text: string) => _hash('SHA-512', text);

/**
 * Creates a RIPEMD160 hash of the supplied string, returned as a hexadecimal string.
 * @param {string} text
 * @returns {Promise<string>}
 */
export const ripemd160 = async (text: string) => _hash('RIPEMD160', text);
