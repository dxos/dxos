//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { createId, createKeyPair } from '@dxos/crypto';
import { codec, createIterator, IEchoStream, FeedSelector } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { createSetPropertyMutation } from '@dxos/model-factory';
import { createWritableFeedStream, jsonReplacer, createWritable, latch } from '@dxos/util';

import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

const log = debug('dxos:echo:pipeline:test');

// TODO(burdon): Test read-only.
describe('pipeline', () => {
  test('streams', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedKeys: Uint8Array[] = [];
    const feedSelector: FeedSelector = descriptor => !!feedKeys.find(key => descriptor.key.equals(key));
    const feedReadStream = await createIterator(feedStore, feedSelector);
    const feed = await feedStore.openFeed('test-feed');
    feedKeys.push(feed.key);
    const writeStream = createWritableFeedStream(feed);

    //
    // Create pipeline.
    //
    const { publicKey: partyKey } = createKeyPair();
    const partyProcessor = new PartyProcessor(partyKey);
    await partyProcessor.takeHints([feed.key]);
    const pipeline = new Pipeline(partyProcessor, feedReadStream);
    const [readStream] = await pipeline.open();
    expect(readStream).toBeTruthy();

    //
    // Pipeline consumer.
    // TODO(burdon): Check order (re-use feed-store-iterator test logic).
    //
    const numMessages = 5;
    const [counter, updateCounter] = latch(numMessages);
    readStream.pipe(createWritable<IEchoStream>(async message => {
      log('Processed:', JSON.stringify(message, jsonReplacer, 2));
      updateCounter();
    }));

    //
    // Write directly to feed store.
    // TODO(burdon): Write to multiple feeds.
    //

    const itemId = createId();
    for (let i = 0; i < numMessages; i++) {
      const message = createSetPropertyMutation(itemId, 'value', String(i));
      writeStream.write(message);
    }

    await counter;
  });
});
