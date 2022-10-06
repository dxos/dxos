//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import pify from 'pify';
import waitForExpect from 'wait-for-expect';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { createBatchStream } from './create-batch-stream';
import { FeedStore } from './feed-store';
import { HypercoreFeed } from './hypercore';

const createFeed = async () => {
  const keyring = new Keyring();
  const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: 'utf-8' });
  const { feed } = await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
  return feed;
};

const append = (feed: HypercoreFeed, message: any) => pify(feed.append.bind(feed))(message);

describe('Batch stream', function () {
  it('Single message', async function () {
    const feed = await createFeed();
    const stream = createBatchStream(feed, { live: true });
    const messages: any[] = [];
    stream.on('data', (data) => {
      data.forEach((message: any) => {
        messages.push(message.data);
      });
    });
    const msg = PublicKey.random().toString();
    await append(feed, msg);
    await waitForExpect(() => {
      expect(messages).toContain(msg);
    });
  });

  it('Five messages', async function () {
    const feed = await createFeed();
    const stream = createBatchStream(feed, { live: true });
    const messages: any[] = [];
    stream.on('data', (data) => {
      data.forEach((message: any) => {
        messages.push(message.data);
      });
    });
    const sent = Array.from(Array(5)).map(() => PublicKey.random().toString());
    for (const msg of sent) {
      await append(feed, msg);
    }
    await waitForExpect(() => {
      for (const msg of sent) {
        expect(messages).toContain(msg);
      }
    });
  });
});
