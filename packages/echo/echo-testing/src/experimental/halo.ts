//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { PublicKey } from '@dxos/protocols';

import { decode, encode, Feed, FeedDescriptor, FeedType } from './pipeline';
import { Space } from './space';

const log = debug('dxos:halo');

const createCredential = (type: string, data: any = undefined) => {
  return {
    type,
    data
  };
};

export class Device {
  readonly key = PublicKey.random();

  constructor (
    readonly writableFeedKey?: PublicKey
  ) {}
}

export class HALO {
  private _space = new Space();

  get initialized () {
    return !!this._space;
  }

  toString () {
    return `HALO(${this._space})`;
  }

  async start () {
    // Process credentials.
    setImmediate(async () => {
      assert(this._space);
      const iterator = this._space.pipeline.messageIterator;
      for await (const [message, feedKey, i] of iterator.reader()) {
        const { type, data: { key } } = decode(message);
        // TODO(burdon): Add writable feed to feedstore.
        console.log('::::', type, key);
      }

      log('DONE');
    });
  }

  async stop () {
    assert(this._space);

    const iterator = this._space.pipeline.messageIterator;
    iterator.stop();
  }

  async genesis () {
    // Assert empty.
    const feed = this._space.feedStore.getFeedDescriptors().find(({ type }) => type === FeedType.GENESIS);
    if (feed) {
      throw new Error('Genesis already created.');
    }

    const genesisDescriptor = new FeedDescriptor(FeedType.GENESIS);
    this._space.feedStore.addFeed(genesisDescriptor);

    const spaceKey = PublicKey.random();
    genesisDescriptor.feed.append(encode(createCredential('genesis', { key: spaceKey.toHex() })));

    const identityKey = PublicKey.random();
    genesisDescriptor.feed.append(encode(createCredential('identity', { key: identityKey.toHex() })));

    await this.authDevice(genesisDescriptor.feed, new Device(genesisDescriptor.feed.key));
  }

  async authDevice (feed: Feed, device: Device) {
    feed.append(encode(createCredential('device', { key: device.key.toHex() })));
    if (device.writableFeedKey) {
      feed.append(encode(createCredential('feed', { key: device.writableFeedKey.toHex() })));
    }
  }
}
