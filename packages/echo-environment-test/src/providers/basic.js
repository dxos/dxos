//
// Copyright 2020 DxOS.
//

import pify from 'pify';
import bufferJson from 'buffer-json-encoding';
import assert from 'assert';

import { Protocol } from '@dxos/protocol';
import { DefaultReplicator } from '@dxos/protocol-plugin-replicator';
import { ModelFactory } from '@dxos/model-factory';
import { FeedStore } from '@dxos/feed-store';

import { Provider, networkTypes } from './provider';

export class BasicProvider extends Provider {
  constructor (options = {}) {
    const { initialPeers = 1, codec = bufferJson, network = { type: networkTypes.NO_LINKS, parameters: [initialPeers] }, ...providerOptions } = options;

    super({ network, ...providerOptions });

    this._codec = codec;
  }

  async createPeer (topic, peerId) {
    const feedStore = await FeedStore.create(this.createStorage(peerId), {
      feedOptions: {
        valueEncoding: 'custom-codec'
      },
      codecs: {
        'custom-codec': this._codec
      }
    });

    const feed = await feedStore.openFeed('/local', { metadata: { topic: topic.toString('hex') } });

    const modelFactory = new ModelFactory(feedStore, {
      onAppend (message) {
        return pify(feed.append.bind(feed))(message);
      }
    });

    return {
      client: {
        feedStore,
        modelFactory
      },
      createStream: replicateAll({ topic, peerId, feedStore, feed })
    };
  }

  invitePeer ({ fromPeer, toPeer }) {
    return this._network.addConnection(fromPeer.id, toPeer.id);
  }
}

export const replicateAll = ({ topic, peerId, feedStore, feed }) => {
  assert(topic);
  assert(peerId);
  assert(feedStore);
  assert(feed);

  const replicator = new DefaultReplicator({
    feedStore,
    onLoad: () => feedStore.getOpenFeeds()
  });

  return () => new Protocol({
    streamOptions: {
      live: true
    }
  })
    .setSession({ peerId })
    .setExtensions([replicator.createExtension()])
    .init(topic)
    .stream;
};
