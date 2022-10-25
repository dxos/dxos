//
// Copyright 2020 DXOS.org
//

import CryptoJS from 'crypto-js';
import assert from 'node:assert';

/**
 * Encrypt string plaintext to a base64-encoded string ciphertext.
 * @param plaintext
 * @param passphrase
 * @param cipher see https://cryptojs.gitbook.io/docs/#ciphers
 * @returns ciphertext
 */
export const encrypt = (
  plaintext: string,
  passphrase: string,
  cipher = 'AES'
) => {
  assert(typeof passphrase === 'string');
  assert(typeof cipher === 'string');

  return (CryptoJS as any)[cipher].encrypt(plaintext, passphrase).toString();
};

/**
 * Decrypt from a base64-encoded string ciphertext to string plaintext.
 * @param ciphertext
 * @param passphrase
 * @param cipher see https://cryptojs.gitbook.io/docs/#ciphers
 * @returns plaintext
 */
export const decrypt = (
  ciphertext: string,
  passphrase: string,
  cipher = 'AES'
) => {
  assert(typeof ciphertext === 'string');
  assert(typeof passphrase === 'string');
  assert(typeof cipher === 'string');

  const bytes = (CryptoJS as any)[cipher].decrypt(ciphertext, passphrase);
  return bytes.toString(CryptoJS.enc.Utf8);
};
