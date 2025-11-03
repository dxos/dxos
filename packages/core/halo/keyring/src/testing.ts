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
export const generateJWKKeyPair = async (): Promise<TestKeyPair> => {
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
  const publicKeyHex = Array.from(publicKeyBuffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return {
    privateKey: privateKeyExported,
    publicKey: publicKeyExported,
    publicKeyHex,
  };
};

/**
 * Parse a key pair from JWK format.
 */
export const parseJWKKeyPair = async (privateKey: JsonWebKey, publicKey: JsonWebKey): Promise<CryptoKeyPair> => ({
  privateKey: await subtleCrypto.importKey('jwk', privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']),
  publicKey: await subtleCrypto.importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']),
});
