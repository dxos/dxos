//
// Copyright 2019 DXOS.org
//

import util from 'node:util';
import { Writable } from 'readable-stream';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { log } from '@dxos/log';

import { HypercoreFactory } from './hypercore-factory';
import { createReadable } from './streams';

describe('Hypercore', function () {
  it('reads from stream', async function () {
    const factory = new HypercoreFactory<string>();
    const { publicKey, secretKey } = createKeyPair();
    const core = factory.createFeed(publicKey, { secretKey });

    const numBlocks = 10;
    const [closed, setClosed] = latch();
    const [processed, incProcessed] = latch({ count: numBlocks });

    const readStream = createReadable(core.createReadStream({ live: true }));
    readStream.on('close', () => {
      log('closed');
      setClosed();
    });

    const writeStream = readStream.pipe(new Writable({
      objectMode: true,
      write: (data: any, encoding: string, next: () => void) => {
        log('received', { data: data.toString(encoding) });
        incProcessed();
        next();
      }
    }));

    {
      const append = util.promisify(core.append.bind(core));
      for (const i of Array.from(Array(numBlocks)).keys()) {
        await append(`message-${i}`);
      }
    }

    await processed();

    readStream.unpipe(writeStream);
    readStream.destroy();

    await closed();
  });

  it('feed closed while stream is open', async function () {
    const factory = new HypercoreFactory<string>();
    const { publicKey, secretKey } = createKeyPair();
    const core = factory.createFeed(publicKey, { secretKey });

    const [closed, setClosed] = latch();
    {
      const readStream = createReadable(core.createReadStream({ live: false }));
      readStream.on('close', () => {
        log('closed');
        setClosed();
      });

      readStream.destroy();
    }
    await closed();

    // TODO(burdon): Error: Feed is closed (if live)
    const close = util.promisify(core.close.bind(core));
    await close();
  });
});
