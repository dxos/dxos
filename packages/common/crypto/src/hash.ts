//
// Copyright 2020 DXOS.org
//

import CryptoJS from 'crypto-js';
import assert from 'node:assert';

/**
 *
 * @param algorithm
 * @param plaintext
 */
const _hash = (algorithm: string, plaintext: string): string => {
  assert(typeof algorithm === 'string');
  assert(typeof plaintext === 'string');

  return (CryptoJS as any)[algorithm](plaintext).toString();
};

/**
 * Creates a SHA-1 hash of the supplied string, returned as a hexadecimal string.
 * @param text
 */
export const sha1 = (text: string) => _hash('SHA1', text);

/**
 * Creates a SHA-256 hash of the supplied string, returned as a hexadecimal string.
 * @param text
 */
export const sha256 = (text: string) => _hash('SHA256', text);

/**
 * Creates a SHA-512 hash of the supplied string, returned as a hexadecimal string.
 * @param text
 */
export const sha512 = (text: string) => _hash('SHA512', text);

/**
 * Creates a SHA-512 hash of the supplied string, returned as a hexadecimal string.
 * @param text
 */
export const ripemd160 = (text: string) => _hash('RIPEMD160', text);
