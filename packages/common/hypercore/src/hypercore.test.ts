//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import hypercore from 'hypercore';
import ram from 'random-access-memory';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { createStorage, StorageType } from '@dxos/random-access-storage';

describe('Hypercore', function () {
  it('replicates', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const directory1 = createStorage({type: StorageType.RAM}).createDirectory();
    const core1 = hypercore((filename) => directory1.getOrCreateFile(filename), publicKey, { secretKey });
    const directory2 = createStorage({type: StorageType.RAM}).createDirectory();
    const core2 = hypercore((filename) => directory2.getOrCreateFile(filename), publicKey);

    // Wait for ready.
    {
      const [ready, done] = latch({ count: 2 });
      core1.open(done);
      core2.open(done);

      await ready();
    }

    const numBlocks = 10;

    // Sync.
    {
      const stream1 = core1.replicate(true);
      const stream2 = core2.replicate(false);

      const [streamsClosed, onClose] = latch({ count: 2 });
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(core1.stats.peers).to.have.lengthOf(1);
      expect(core2.stats.peers).to.have.lengthOf(1);

      // Wait for complete sync.
      core2.on('sync', () => {
        stream1.end();
        stream2.end();
      });

      // Write.
      for (let i = 0; i < numBlocks; i++) {
        core1.append(`test-${i}`);
      }

      await streamsClosed();
    }

    // Close.
    {
      const [closed, close] = latch({ count: 2 });
      core1.close(close);
      core1.close(close);

      await closed();
    }

    expect(core1.stats.totals.uploadedBlocks).to.eq(numBlocks);
    expect(core2.stats.totals.downloadedBlocks).to.eq(numBlocks);
  });
});
