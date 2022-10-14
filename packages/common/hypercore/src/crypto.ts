//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { AbstractValueEncoding, Callback, Crypto } from 'hypercore';
import { callbackify } from 'node:util';

import { Signer, verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

/**
 * Create encoding (e.g., from protobuf codec).
 */
// TODO(burdon): Move to feed-store?
export const createEncoding = (codec: AbstractValueEncoding): AbstractValueEncoding => ({
  encode: (data: any) => Buffer.from(codec.encode(data)),
  decode: codec.decode.bind(codec)
});

/**
 * Create a custom hypercore crypto signer.
 */
// TODO(burdon): Create test without adding deps.
export const createCrypto = (signer: Signer, publicKey: PublicKey): Crypto => {
  assert(signer);
  assert(publicKey);

  return {
    sign: (data: any, secretKey: any, cb: Callback<Buffer>) => {
      callbackify(signer.sign.bind(signer!))(publicKey, data, (err, result) => {
        if (err) {
          cb(err);
          return;
        }

        cb(null, Buffer.from(result));
      });
    },

    verify: async (data: any, signature: any, key: any, cb: any) => {
      callbackify(verifySignature)(key, data, signature, cb);
    }
  };
};
