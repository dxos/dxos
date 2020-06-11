//
// Copyright 2020 Wireline, Inc.
//

import assert from 'assert';

import levelmem from 'level-mem';
import multi from 'multi-read-stream';
import eos from 'end-of-stream';

import { FeedLevelIndexer } from '@dxos/feed-level-indexer';
import { discoveryKey } from '@dxos/crypto';

import { createMatcher } from './filter';

const INDEX = 'TopicType';

/**
 * Factory for cached read streams.
 */
export class Subscriber {
  constructor (feedStore, db = levelmem()) {
    assert(feedStore);

    this._feedStore = feedStore;
    this._db = db;

    this._source = {
      stream (getFeedStart) {
        return feedStore.createBatchStream(descriptor => {
          return { live: true, start: getFeedStart(descriptor.key), feedStoreInfo: true };
        });
      },

      async get (key, seq) {
        const descriptor = feedStore.getDescriptorByDiscoveryKey(discoveryKey(key));
        if (!descriptor) {
          throw new Error('Missing descriptor.');
        }

        const feed = descriptor.opened ? descriptor.feed : await descriptor.open();
        return new Promise((resolve, reject) => feed.get(seq, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }));
      }
    };

    this._indexer = new FeedLevelIndexer(this._db, this._source).by(INDEX,
      (feed, state) => [feed.metadata.topic, feed.data.__type_url, state.seq, feed.seq]);

    this._indexer.open().catch(err => console.error(err));
  }

  /**
   * Creates a cached readable stream.
   *
   * @param {string} [topic]
   * @param {Object} [filter]
   * @param {Object} [subscriptionOptions]
   * @return {{ stream: ReadableStream, unsubscribe: Function }}
   */
  createSubscription (topic, filter, subscriptionOptions) {
    const { __type_url: type, ...restFilter } = filter || {};

    let stream;
    if (type instanceof RegExp) {
      // Slow operation it has to iterate over the entire list of the current topic messages.
      stream = this._subscribe([topic], { ...restFilter, __type_url: type }, subscriptionOptions);
    } else if (Array.isArray(type)) {
      // We need to subscribe to each type.
      stream = multi.obj();
      let toSync = type.length;
      type.forEach((type) => {
        const subStream = this._subscribe([topic, type], restFilter, subscriptionOptions);
        subStream.once('sync', () => {
          toSync--;
          if (toSync === 0) {
            stream.emit('sync');
          }
        });
        stream.add(subStream);
      });
    } else {
      stream = this._subscribe([topic, type].filter(Boolean), restFilter, subscriptionOptions);
    }

    stream.on('error', err => console.error(err));

    return {
      stream,
      unsubscribe: () => {
        if (stream.destroyed) return;
        const waitForDestroy = new Promise(resolve => eos(stream, () => {
          resolve();
        }));
        stream.destroy();
        return waitForDestroy;
      }
    };
  }

  _subscribe (prefix, filter, readStreamOptions = {}) {
    return this._indexer.subscribe(INDEX, prefix, { filter: createMatcher(filter), ...readStreamOptions });
  }
}
