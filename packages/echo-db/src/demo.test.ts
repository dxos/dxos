//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Import IDEA settings from mbp.

import ram from 'random-access-memory';

import { FeedStore } from '@dxos/feed-store';

test('model', async done => {
  // TODO(burdon): Remove async constructor.
  const feedStore = new FeedStore(ram);
  await feedStore.open();

  const feed = await feedStore.openFeed('test');

  const stream = feedStore.createReadStream();
  stream.on('data', (data: any) => {
    console.log(':::::', data);
    done();
  });

  // TODO(burdon): Protobuf, encoding.
  feed.append(JSON.stringify({ message: 'test' }));
});

// TODO(burdon): Item streams
