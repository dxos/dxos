//
// Copyright 2020 DXOS.org
//

import pify from 'pify';

import { createKeyPair } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { PublicKey, Timeframe, schema } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { createFeedWriter } from './feed-writer';

const codec = schema.getCodecForType('dxos.echo.feed.FeedMessage');

describe('Feed tests:', () => {
  test('codec', () => {
    const message1: FeedMessage = { 
      timeframe: new Timeframe(),
      payload: {
        '@type': 'google.protobuf.Empty',
      }
    };

    const buffer = codec.encode(message1);

    const message2 = codec.decode(buffer);

    expect(message1).toEqual(message2);
  });

  test('hypercore', async () => {
    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: codec });

    const { publicKey, secretKey } = createKeyPair();
    const { feed } = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    expect(feed.length).toBe(0);

    const data: FeedMessage = { 
      timeframe: new Timeframe(),
      payload: {
        '@type': 'google.protobuf.Empty',
      }
    };

    await pify(feed.append.bind(feed))(data);

    expect(feed.length).toBe(1);
    const block = await pify(feed.get.bind(feed))(0);
    expect(block).toEqual(data);
  });

  test('feed writer', async () => {
    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: codec });

    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    const writer = createFeedWriter<FeedMessage>(feed);

    const data: FeedMessage = {
      timeframe: new Timeframe(),
      payload: {
        '@type': 'dxos.echo.feed.EchoEnvelope',
        itemId: 'id',
        genesis: {
          itemType: 'foo',
          modelType: 'bar'
        }
      }
    };
    const receipt = await writer.write(data);

    expect(receipt.feedKey.equals(feed.key)).toBe(true);
    expect(receipt.seq).toEqual(0);

    expect(feed.feed.length).toEqual(1);

    const block = await pify(feed.feed.get.bind(feed))(0);
    expect(block).toEqual(data);
  });
});
