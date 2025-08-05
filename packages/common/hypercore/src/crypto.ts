//
// Copyright 2022 DXOS.org
//

import { callbackify } from 'node:util';

import { type AbstractValueEncoding, type Crypto } from 'hypercore';

import { type Codec, type EncodingOptions } from '@dxos/codec-protobuf';
import { type Signer, verifySignature } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { arrayToBuffer } from '@dxos/util';

/**
 * Create encoding (e.g., from protobuf codec).
 */
export const createCodecEncoding = <T>(codec: Codec<T>, opts?: EncodingOptions): AbstractValueEncoding<T> => ({
  encode: (obj: T) => arrayToBuffer(codec.encode(obj, opts)),
  decode: (buffer: Buffer) => codec.decode(buffer, opts),
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
