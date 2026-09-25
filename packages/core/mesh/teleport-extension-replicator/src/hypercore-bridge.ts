//
// Copyright 2026 DXOS.org
//

import { Duplex } from 'node:stream';

import { type DuplexStream } from '@dxos/teleport';

/**
 * Adapts a web-stream byte pipe to the Node `Duplex` that hypercore's `feed.replicate()` requires.
 *
 * This is the only place in MESH that still needs a Node stream: `@dxos/vendor-hypercore` dictates
 * the interface and is not ours to reshape. Keeping the bridge here — rather than in the muxer —
 * is what lets every other package in the stack compile without the `readable-stream` polyfill.
 *
 * Hand-written because `Duplex.fromWeb` takes `node:stream/web`'s `ReadableStream`, a different
 * declaration from the global one the seam is typed with.
 */
export const toNodeDuplex = (stream: DuplexStream): Duplex => {
  const reader = stream.readable.getReader();
  const writer = stream.writable.getWriter();

  const duplex: Duplex = new Duplex({
    read: () => {
      reader
        .read()
        .then(({ done, value }) => {
          // hypercore-protocol reads `Buffer`, not any typed array, so the copy here is load-bearing.
          duplex.push(done || !value ? null : Buffer.from(value));
        })
        .catch((err) => {
          duplex.destroy(err);
        });
    },
    write: (chunk, _encoding, callback) => {
      writer.write(chunk).then(() => callback(), callback);
    },
    final: (callback) => {
      writer.close().then(() => callback(), callback);
    },
    destroy: (err, callback) => {
      void reader.cancel().catch(() => {});
      void writer.abort().catch(() => {});
      callback(err);
    },
  });

  return duplex;
};
