//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

import { FeedStore } from './feed-store';
import { createFeedWriter } from './feed-writer';

const codec = schema.getCodecForType('dxos.echo.feed.FeedMessage');

describe('Feed tests.', function () {
  it('codec', function () {
    const message1: FeedMessage = {
      timeframe: new Timeframe(),
      payload: {
        '@type': 'google.protobuf.Empty'
      }
    };

    const buffer = codec.encode(message1);
    const message2 = codec.decode(buffer);
    expect(message1).toEqual(message2);
  });

  it.skip('hypercore', async function () {
    const feedStore = new FeedStore(
      createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: codec });

    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    expect(feed.length).toBe(0);

    const data: FeedMessage = {
      timeframe: new Timeframe(),
      payload: {
        '@type': 'google.protobuf.Empty'
      }
    };

    await feed.append(data);
    expect(feed.length).toBe(1);

    const block = await feed.get(0);
    expect(block).toEqual(data);
  });

  it.skip('feed writer', async function () {
    const feedStore = new FeedStore(
      createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: codec });

    const { publicKey, secretKey } = createKeyPair();
    const feedDescriptor = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    const writer = createFeedWriter<FeedMessage>(feedDescriptor);

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
    expect(receipt.feedKey.equals(feedDescriptor.key)).toBe(true);
    expect(receipt.seq).toEqual(0);
    expect(feedDescriptor.length).toEqual(1);

    const block = await feedDescriptor.get(0);
    expect(block).toEqual(data);
  });
});
