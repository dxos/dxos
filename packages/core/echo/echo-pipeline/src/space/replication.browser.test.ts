//
// Copyright 2021 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import type { FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

import { valueEncoding } from '../common';

describe('replication', () => {
  test('replicates a feed through a direct stream', async () => {
    // Some storage drivers may break when there are multiple storage instances.
    const storage = createStorage();

    // Creates an appropriate persistent storage for the browser: IDB in Chrome or File storage in Firefox.
    const keyring1 = new Keyring();
    const feedStore1 = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds1'),
        signer: keyring1,
        hypercore: {
          valueEncoding,
        },
      }),
    });

    const keyring2 = new Keyring();
    const feedStore2 = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds2'),
        signer: keyring2,
        hypercore: {
          valueEncoding,
        },
      }),
    });

    const feed1 = await feedStore1.openFeed(await keyring1.createKey(), {
      writable: true,
    });
    const feed2 = await feedStore2.openFeed(feed1.key);

    const stream1 = feed1.replicate(true, { live: true, noise: false, encrypted: false });
    const stream2 = feed2.replicate(false, { live: true, noise: false, encrypted: false });
    stream1.pipe(stream2).pipe(stream1);

    await feed1.append({
      timeframe: new Timeframe([[feed1.key, 123]]),
    });

    await expect.poll(() => feed2.properties.length).toEqual(1);
  });
});
