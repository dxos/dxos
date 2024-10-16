//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

import { subtleCrypto } from './subtle';

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

/**
 * Creates an Ed25519 (libsodium keypair format) signature.
 */
export const ed25519Signature = async (secretKey: Uint8Array, message: Uint8Array): Promise<Uint8Array> => {
  const curve = 'Ed25519';
  const privateKeyJwk = {
    kty: 'OKP',
    crv: curve,
    x: Buffer.from(secretKey.subarray(32)).toString('base64url'),
    d: Buffer.from(secretKey.subarray(0, 32)).toString('base64url'),
  };
  const key = await subtleCrypto.importKey('jwk', privateKeyJwk, { name: curve }, true, ['sign']);
  return new Uint8Array(await subtleCrypto.sign({ name: curve, hash: 'SHA-256' }, key, message));
};
