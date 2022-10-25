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

    const stream = core.createReadStream({ live: true });
    const consumer: Writable = stream.pipe(
      new Writable({
        write: (data: any, next: () => void) => {
          log('received', { data: String(data) });
          incProcessed();
          next();
        }
      })
    );

    {
      const append = util.promisify(core.append.bind(core));
      for (const i of Array.from(Array(numBlocks)).keys()) {
        await append(`message-${i}`);
      }
    }

    await processed();

    {
      consumer.once('close', () => {
        log('closed');
        setClosed();
      });

      consumer.destroy();
      await closed();
    }
  });

  it('feed closed while stream is open', async function () {
    const factory = new HypercoreFactory<string>();
    const { publicKey, secretKey } = createKeyPair();
    const core = factory.createFeed(publicKey, { secretKey });

    const [closed, setClosed] = latch({ count: 1 });
    {
      const stream = core.createReadStream({ live: true });
      stream.once('close', () => {
        log('closed');
        setClosed();
      });

      stream.destroy();
    }
    await closed();

    const close = util.promisify(core.close.bind(core));
    await close();
  });
});
