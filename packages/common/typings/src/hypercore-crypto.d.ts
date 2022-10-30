//
// Copyright 2022 DXOS.org
//

/**
 * https://github.com/mafintosh/hypercore-crypto
 *
 * https://github.com/mafintosh/hypercore-crypto/blob/v2.3.2/index.js
 * https://github.com/mafintosh/hypercore-crypto/blob/v3.3.0/index.js
 */
// TODO(burdon): Hypercore 9 uses v2 of this module while Hypercore 10 uses v3.
declare module 'hypercore-crypto' {
  export type KeyPair = {
    publicKey: Buffer;
    secretKey: Buffer;
  };

  export function keyPair(seed?: Buffer): KeyPair;
  export function validateKeyPair(keyPair: KeyPair): boolean;
  export function sign(message: any, secretKey: Buffer): Buffer;
  export function verify(message: any, signature: Buffer, publicKey: Buffer): boolean;
  export function randomBytes(length: number): Buffer;
  export function discoveryKey(publicKey: Buffer): Buffer;
}
