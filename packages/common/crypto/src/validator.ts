//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { verify } from '#hypercore-crypto';

/**
 * Generator for signature validation function.
 * @param {String} publicKey
 */
export const getSignatureValidator = (publicKey: string) => (message: Buffer, signature: Buffer) =>
  verify(message, signature, PublicKey.bufferize(publicKey));
