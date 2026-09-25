//
// Copyright 2022 DXOS.org
//

import { callbackify } from 'node:util';

import { type Signer, verifySignature } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { arrayToBuffer } from '@dxos/util';
import { type AbstractValueEncoding, type Crypto } from '@dxos/vendor-hypercore/hypercore';

/**
 * A value codec, structural so a buf codec and a protobuf.js one both satisfy it.
 */
export type ValueCodec<T> = {
  encode(value: T): Uint8Array;
  decode(buffer: Uint8Array): T;
};

/**
 * Create encoding (e.g., from a protobuf codec).
 */
export const createCodecEncoding = <T>(codec: ValueCodec<T>): AbstractValueEncoding<T> => ({
  encode: (obj: T) => arrayToBuffer(codec.encode(obj)),
  decode: (buffer: Buffer) => codec.decode(buffer),
});

/**
 * Create a custom hypercore crypto signer.
 */
// TODO(burdon): Create test without adding deps.
export const createCrypto = (signer: Signer, publicKey: PublicKey): Crypto => {
  invariant(signer);
  invariant(publicKey);

  return {
    sign: (message, secretKey, cb) => {
      callbackify(signer.sign.bind(signer!))(publicKey, message, (err, result) => {
        if (err) {
          cb(err, null);
          return;
        }

        cb(null, arrayToBuffer(result));
      });
    },

    verify: async (message, signature, key, cb) => {
      // NOTE: Uses the public key passed into function.
      callbackify(verifySignature)(publicKey, message, signature, cb);
    },
  };
};
