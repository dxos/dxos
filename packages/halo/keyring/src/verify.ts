//
// Copyright 2022 DXOS.org
//

import * as crypto from 'node:crypto';

import { PublicKey } from '@dxos/keys';

/**
 * Verify a signature with the given key.
 */
export const verifySignature = async (key: PublicKey, message: Uint8Array, signature: Uint8Array): Promise<boolean> => {
  let publicKey!: CryptoKey;
  try {
    publicKey = await crypto.webcrypto.subtle.importKey('raw', key.asUint8Array(), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
  } catch {
    return false;
  }

  return crypto.webcrypto.subtle.verify({
    name: 'ECDSA',
    hash: 'SHA-256'
  }, publicKey, signature, message);
};
