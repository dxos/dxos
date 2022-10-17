//
// Copyright 2019 DXOS.org
//

import hypercore from 'hypercore';
import util from 'node:util';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { log } from '@dxos/log';

import { createAsyncIterator, createReadable } from './streams';
import { ramFactory } from './testing';

describe('Hypercore AsyncIterator', function () {
  it('iterates a feed until stopped', async function () {
    const numBlocks = 10;
    const { publicKey, secretKey } = createKeyPair();
    const core = hypercore(ramFactory(), publicKey, { secretKey });

    // Write.
    {
      const append = util.promisify(core.append.bind(core));
      for (let i = 0; i < numBlocks; i++) {
        await append(`test-${i}`);
      }
    }

    // Read until stopped.
    {
      // Read forever.
      // NOTE: Read must be opened in live mode.
      // NOTE: Uses wrapper to normalize stream; otherwise done isn't called after destroying the stream.
      const stream = createReadable(core.createReadStream({ live: true }));

      // Use util to create reliable iterators.
      const iterator = createAsyncIterator(stream);

      const [streamEnded, end] = latch();
      const [readAll, inc] = latch({ count: numBlocks });
      setTimeout(async () => {
        while (true) {
          const { value, done } = await iterator.next();
          if (done) {
            end();
            break;
          }

          log(String(value));
          inc();
        }
      });

      await readAll();
      stream.destroy();
      await streamEnded();
    }
  });
});
