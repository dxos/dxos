//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { AbstractValueEncoding, Crypto } from 'hypercore';
import { callbackify } from 'node:util';

import { Codec } from '@dxos/codec-protobuf';
import { Signer, verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

/**
 * Create encoding (e.g., from protobuf codec).
 */
export const createCodecEncoding = <T>(
  codec: Codec<T>
): AbstractValueEncoding<T> => ({
  encode: (obj: T) => Buffer.from(codec.encode(obj)),
  decode: (buffer: Buffer) => codec.decode(buffer)
});

/**
 * Create a custom hypercore crypto signer.
 */
// TODO(burdon): Create test without adding deps.
export const createCrypto = (signer: Signer, publicKey: PublicKey): Crypto => {
  assert(signer);
  assert(publicKey);

  return {
    sign: (message, secretKey, cb) => {
      callbackify(signer.sign.bind(signer!))(
        publicKey,
        message,
        (err, result) => {
          if (err) {
            cb(err, null);
            return;
          }

          cb(null, Buffer.from(result));
        }
      );
    },

    verify: async (message, signature, key, cb) => {
      // NOTE: Uses the public key passed into function.
      callbackify(verifySignature)(publicKey, message, signature, cb);
    }
  };
};
