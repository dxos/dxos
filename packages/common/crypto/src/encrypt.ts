//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import CryptoJS from 'crypto-js';

/**
 * Encrypt string plaintext to a base64-encoded string ciphertext.
 * @param {string} plaintext
 * @param {string} passphrase
 * @param {string} cipher see https://cryptojs.gitbook.io/docs/#ciphers
 * @returns {string} ciphertext
 */
export function encrypt (plaintext: string, passphrase: string, cipher = 'AES') {
  assert(typeof passphrase === 'string');
  assert(typeof cipher === 'string');

  return CryptoJS[cipher].encrypt(plaintext, passphrase).toString();
}

/**
 * Decrypt from a base64-encoded string ciphertext to string plaintext.
 * @param {string} ciphertext
 * @param {string} passphrase
 * @param {string} cipher see https://cryptojs.gitbook.io/docs/#ciphers
 * @returns {string} plaintext
 */
export function decrypt (ciphertext: string, passphrase: string, cipher = 'AES') {
  assert(typeof ciphertext === 'string');
  assert(typeof passphrase === 'string');
  assert(typeof cipher === 'string');

  const bytes = CryptoJS[cipher].decrypt(ciphertext, passphrase);
  return bytes.toString(CryptoJS.enc.Utf8);
}
