//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { createBatchStream } from './create-batch-stream';
import { FeedDescriptor } from './feed-descriptor';
import { FeedStore } from './feed-store';

const createFeed = async (): Promise<FeedDescriptor> => {
  const keyring = new Keyring();
  const feedStore = new FeedStore(
    createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: 'utf-8' });

  return await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
};

describe('Batch stream', function () {
  it('Write single message', async function () {
    const feedDescriptor = await createFeed();
    const stream = createBatchStream(feedDescriptor, { live: true });
    const messages: any[] = [];
    stream.on('data', (data) => {
      data.forEach((message: any) => {
        messages.push(message.data);
      });
    });

    const msg = PublicKey.random().toString();
    await feedDescriptor.append(msg);
    await waitForExpect(() => {
      expect(messages).toContain(msg);
    });
  });

  it('Write multiple messages', async function () {
    const feedDescriptor = await createFeed();
    const stream = createBatchStream(feedDescriptor, { live: true });
    const messages: any[] = [];
    stream.on('data', (data) => {
      data.forEach((message: any) => {
        messages.push(message.data);
      });
    });

    const sent = Array.from(Array(5)).map(() => PublicKey.random().toString());
    for (const msg of sent) {
      await feedDescriptor.append(msg);
    }

    await waitForExpect(() => {
      for (const msg of sent) {
        expect(messages).toContain(msg);
      }
    });
  });
});
