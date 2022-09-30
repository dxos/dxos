//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { subtleCrypto } from './crypto';

/**
 * Verify a signature with the given key.
 */
export const verifySignature = async (key: PublicKey, message: Uint8Array, signature: Uint8Array): Promise<boolean> => {
  let publicKey!: CryptoKey;
  try {
    publicKey = await subtleCrypto.importKey('raw', key.asUint8Array(), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
  } catch {
    return false;
  }

  return subtleCrypto.verify({
    name: 'ECDSA',
    hash: 'SHA-256'
  }, publicKey, signature, message);
};
