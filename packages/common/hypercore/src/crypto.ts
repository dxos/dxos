//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { AbstractValueEncoding, Crypto, Hypercore } from 'hypercore';
import { callbackify } from 'node:util';
import { Readable } from 'readable-stream';

import { Signer, verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

// TODO(burdon): Move to hypercore.
// TODO(burdon): Missing block info (e.g., seq).
// https://nodejs.org/dist/v18.9.0/docs/api/stream.html#readablewrapstream
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
export const createReadable = (feed: Hypercore): Readable => {
  const feedStream = feed.createReadStream({ live: true }) as any;
  return new Readable({ objectMode: true }).wrap(feedStream as any);
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
    sign: (data, secretKey, cb) => {
      callbackify(signer.sign.bind(signer!))(publicKey, data, (err, result) => {
        if (err) {
          cb(err);
          return;
        }

        cb(null, Buffer.from(result));
      });
    },

    verify: async (data, signature, key, cb) => {
      // NOTE: Uses the public key passed into function.
      callbackify(verifySignature)(publicKey, data, signature, cb);
    }
  };
};
