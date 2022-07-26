//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition, latch } from '@dxos/async';
import { createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { createId, createKeyPair } from '@dxos/crypto';
import { codec, createFeedWriter, FeedSelector, FeedStoreIterator, IEchoStream } from '@dxos/echo-protocol';
import { FeedStore, createWritableFeedStream } from '@dxos/feed-store';
import { createSetPropertyMutation } from '@dxos/model-factory';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { jsonReplacer } from '@dxos/util';

import { TimeframeClock } from '../packlets/database';
import { FeedMuxer } from './feed-muxer';
import { PartyProcessor } from './party-processor';

const log = debug('dxos:echo:pipeline:test');

// TODO(burdon): Test read-only.
describe('FeedMuxer', () => {
  test('streams', async () => {
    const storage = createStorage('', StorageType.RAM);
    const feedStore = new FeedStore(storage.directory('feed'), { valueEncoding: codec });
    const feedKeys: Uint8Array[] = [];
    const feedSelector: FeedSelector = descriptor => !!feedKeys.find(key => descriptor.key.equals(key));
    const feedReadStream = new FeedStoreIterator(feedSelector, () => 0, new Timeframe());

    const { publicKey, secretKey } = createKeyPair();
    const descriptor = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    const feed = descriptor.feed;
    feedKeys.push(feed.key);
    feedReadStream.addFeedDescriptor(descriptor);
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
      data: createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey),
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      }
    });

    //
    // Pipeline consumer.
    // TODO(burdon): Check order (re-use feed-store-iterator test logic).
    //
    const numMessages = 5;
    const [counter, updateCounter] = latch(numMessages);
    const echoProcessor = async (message: IEchoStream) => {
      log('Processed:', JSON.stringify(message, jsonReplacer, 2));
      updateCounter();
    };

    const pipeline = new FeedMuxer(partyProcessor, feedReadStream, new TimeframeClock());
    pipeline.setEchoProcessor(echoProcessor);
    await pipeline.open();

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
    const storage = createStorage('', StorageType.RAM);
    const feedStore = new FeedStore(storage.directory('feed'), { valueEncoding: codec });
    const feedReadStream = new FeedStoreIterator(() => true, () => 0, new Timeframe());

    const { publicKey, secretKey } = createKeyPair();
    const descriptor = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    const feed = descriptor.feed;
    feedReadStream.addFeedDescriptor(descriptor);

    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.addKeyRecord({
      publicKey: PublicKey.from(feed.key),
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);

    const echoMessages: IEchoStream[] = [];
    const echoProcessor = async (msg: IEchoStream) => {
      echoMessages.push(msg);
    };

    const pipeline = new FeedMuxer(
      partyProcessor,
      feedReadStream,
      new TimeframeClock(),
      createFeedWriter(feed)
    );
    pipeline.setEchoProcessor(echoProcessor);
    await pipeline.open();

    await pipeline.outboundHaloStream!.write(createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey));
    await waitForCondition(() => !partyProcessor.genesisRequired);

    await pipeline.outboundEchoStream!.write({
      itemId: '123',
      genesis: {
        itemType: 'foo',
        modelType: 'bar'
      }
    });

    await waitForCondition(() => echoMessages.length === 1);

    expect(partyProcessor.genesisRequired).toEqual(false);
    expect((echoMessages[0] as any).data).toEqual({
      itemId: '123',
      genesis: {
        itemType: 'foo'
      }
    });
  });
});
