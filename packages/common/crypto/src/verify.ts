//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

import { subtleCrypto } from '#subtle';

/**
 * Verify a signature with the given key.
 */
export const verifySignature = async (
  key: PublicKey,
  message: Uint8Array,
  signature: Uint8Array,
  algorithm: { name: string; namedCurve?: string } = { name: 'ECDSA', namedCurve: 'P-256' },
): Promise<boolean> => {
  let publicKey!: CryptoKey;

  try {
    publicKey = await subtleCrypto.importKey('raw', key.asUint8Array(), algorithm, true, ['verify']);
  } catch {
    return false;
  }

  return subtleCrypto.verify(
    {
      name: algorithm.name,
      hash: 'SHA-256',
    },
    publicKey,
    signature,
    message,
  );
};
