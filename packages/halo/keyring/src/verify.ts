import { PublicKey } from "@dxos/protocols";
import * as crypto from 'node:crypto';

/**
 * Verify a signature with the given key.
 */
export const verifySignature = async (key: PublicKey, message: Uint8Array, signature: Uint8Array): Promise<boolean> => {
  const publicKey = await crypto.webcrypto.subtle.importKey('raw', key.asUint8Array(), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);

  return crypto.webcrypto.subtle.verify({
    name: 'ECDSA',
    hash: 'SHA-256'
  }, publicKey, signature, message);
}