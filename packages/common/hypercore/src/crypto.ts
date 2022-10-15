//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { AbstractValueEncoding, Crypto } from 'hypercore';
import { callbackify } from 'node:util';
import { Readable } from 'readable-stream';
import { Readable as XReadable } from 'streamx';

import { Signer, verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

/**
 * Converts streamx.Readable to iterable Readable.
 *
 * https://nodejs.org/dist/v18.9.0/docs/api/stream.html#readablewrapstream
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
 */
export const createReadable = (stream: XReadable): Readable => {
  return new Readable({ objectMode: true }).wrap(stream as any);
};

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
    sign: (message, secretKey, cb) => {
      callbackify(signer.sign.bind(signer!))(publicKey, message, (err, result) => {
        if (err) {
          cb(err);
          return;
        }

        cb(null, Buffer.from(result));
      });
    },

    verify: async (message, signature, key, cb) => {
      // NOTE: Uses the public key passed into function.
      callbackify(verifySignature)(publicKey, message, signature, cb);
    }
  };
};
