//
// Copyright 2019 DXOS.org
//

import util from 'node:util';
import { Writable } from 'streamx';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { log } from '@dxos/log';

import { HypercoreFactory } from './hypercore-factory';

describe('Hypercore', function () {
  it('reads from stream', async function () {
    const factory = new HypercoreFactory<string>();
    const { publicKey, secretKey } = createKeyPair();
    const core = factory.createFeed(publicKey, { secretKey });

    const numBlocks = 10;
    const [closed, setClosed] = latch();
    const [processed, incProcessed] = latch({ count: numBlocks });

    const readStream = core.createReadStream({ live: true });
    const consumer = readStream.pipe(new Writable({
      write (data: any, next: () => void) {
        log('received', { data: String(data) });
        incProcessed();
        next();
      }
    }));

    consumer.on('close', () => {
      log('closed');
      setClosed();
    });

    {
      const append = util.promisify(core.append.bind(core));
      for (const i of Array.from(Array(numBlocks)).keys()) {
        await append(`message-${i}`);
      }
    }

    await processed();

    consumer.destroy();
    await closed();
  });

  it('feed closed while stream is open', async function () {
    const factory = new HypercoreFactory<string>();
    const { publicKey, secretKey } = createKeyPair();
    const core = factory.createFeed(publicKey, { secretKey });

    const [closed, setClosed] = latch({ count: 1 });
    {
      const readStream = core.createReadStream({ live: true });
      readStream.on('close', () => {
        log('closed');
        setClosed();
      });

      readStream.destroy();
    }
    await closed();

    const close = util.promisify(core.close.bind(core));
    await close();
  });
});
