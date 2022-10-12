//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import hypercore from 'hypercore';
import ram from 'random-access-memory';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';

import { wrapFeed } from './hypercore-feed';

describe('Feed', function () {
  it('replicates', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const feed1 = wrapFeed(hypercore(ram, publicKey, { secretKey }));
    const feed2 = wrapFeed(hypercore(ram, publicKey));

    // Wait for ready.
    {
      await feed1.open();
      await feed2.open();
    }

    const numBlocks = 10;

    // Sync.
    {
      const stream1 = feed1.replicate(true);
      const stream2 = feed2.replicate(false);

      const [streamsClosed, onClose] = latch({ count: 2 });
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(feed1.stats.peers).to.have.lengthOf(1);
      expect(feed2.stats.peers).to.have.lengthOf(1);

      // Wait for complete sync.
      feed2.on('sync', () => {
        stream1.end();
        stream2.end();
      });

      // Write.
      for (let i = 0; i < numBlocks; i++) {
        void feed1.append(`test-${i}`);
      }

      await streamsClosed();
    }

    // Close.
    {
      await feed1.close();
      await feed1.close();
    }

    expect(feed1.stats.totals.uploadedBlocks).to.eq(numBlocks);
    expect(feed2.stats.totals.downloadedBlocks).to.eq(numBlocks);
  });
});
