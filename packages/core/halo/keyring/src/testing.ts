//
// Copyright 2023 DXOS.org
//

import { subtleCrypto } from '@dxos/crypto';

export type TestKeyPair = {
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
  publicKeyHex: string;
};

/**
 * Generate a key pair which for testing purposes.
 * @returns {Promise<TestKeyPair>}
 */
export const generateKeyPair = async (): Promise<TestKeyPair> => {
  const keyPair = await subtleCrypto.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  );

  const privateKeyExported = await subtleCrypto.exportKey('jwk', keyPair.privateKey);
  const publicKeyExported = await subtleCrypto.exportKey('jwk', keyPair.publicKey);

  // Convert the public key to hex format
  const publicKeyBuffer = new Uint8Array(await subtleCrypto.exportKey('raw', keyPair.publicKey));
  const publicKeyHex = Array.from(publicKeyBuffer).map(byte => byte.toString(16).padStart(2, '0')).join('');

  return {
    privateKey: privateKeyExported,
    publicKey: publicKeyExported,
    publicKeyHex,
  };
}
