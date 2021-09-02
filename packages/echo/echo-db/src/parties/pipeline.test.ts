//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition, latch } from '@dxos/async';
import { createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { createId, createKeyPair, PublicKey } from '@dxos/crypto';
import { codec, createFeedWriter, createIterator, FeedSelector, IEchoStream, Timeframe } from '@dxos/echo-protocol';
import { FeedStore, HypercoreFeed, createWritableFeedStream, createWritable, WritableArray } from '@dxos/feed-store';
import { createSetPropertyMutation } from '@dxos/model-factory';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { jsonReplacer } from '@dxos/util';

import { TimeframeClock } from '../items';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

const log = debug('dxos:echo:pipeline:test');

// TODO(burdon): Test read-only.
describe('pipeline', () => {
  test('streams', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { valueEncoding: codec });
    const feedKeys: Uint8Array[] = [];
    const feedSelector: FeedSelector = descriptor => !!feedKeys.find(key => descriptor.key.equals(key));
    await feedStore.open();
    const feedReadStream = await createIterator(feedStore, feedSelector);

    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });
    feedKeys.push(feed.key);
    const writeStream = createWritableFeedStream(feed);

    //
    // Create pipeline.
    //
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.addKeyRecord({
      publicKey: PublicKey.from(feed.key),
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });
    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    await partyProcessor.processMessage({
      data: createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey),
      meta: {
        feedKey: feedKey.publicKey.asBuffer(),
        seq: 0
      }
    });
    const pipeline = new Pipeline(partyProcessor, feedReadStream, new TimeframeClock());
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

  test('writing', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { valueEncoding: codec });
    await feedStore.open();
    const feedReadStream = await createIterator(feedStore);

    const { publicKey, secretKey } = createKeyPair();
    const feed: HypercoreFeed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });

    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.addKeyRecord({
      publicKey: PublicKey.from(feed.key),
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    const pipeline = new Pipeline(
      partyProcessor,
      feedReadStream,
      new TimeframeClock(),
      createFeedWriter(feed)
    );
    await pipeline.open();

    const writable = new WritableArray();
    pipeline.inboundEchoStream!.pipe(writable);

    await pipeline.outboundHaloStream!.write(createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey));
    await waitForCondition(() => !partyProcessor.genesisRequired);

    await pipeline.outboundEchoStream!.write({
      itemId: '123',
      genesis: {
        itemType: 'foo'
      }
    });

    await waitForCondition(() => writable.objects.length === 1);

    expect(partyProcessor.genesisRequired).toEqual(false);
    expect((writable.objects[0] as any).data).toEqual({
      itemId: '123',
      genesis: {
        itemType: 'foo'
      },
      timeframe: expect.any(Timeframe)
    });
  });
});
