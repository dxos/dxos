//
// Copyright 2020 DXOS.org
//

import { verify } from 'hypercore-crypto';

import { keyToBuffer } from './keys';

/**
 * Generator for signature validation function.
 * @param {String} publicKey
 */
export const getSignatureValidator =
  (publicKey: string) => (message: Buffer, signature: Buffer) => verify(message, signature, keyToBuffer(publicKey));
