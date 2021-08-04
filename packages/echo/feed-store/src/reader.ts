//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import eos from 'end-of-stream';
import multi from 'multi-read-stream';
import pump from 'pump';
import through from 'through2';

import { createBatchStream } from './create-batch-stream';
import type { FeedDescriptor } from './feed-descriptor';

const all = () => true;

/**
 * Creates a multi ReadableStream for feed streams.
 */
export default class Reader {
  public _filter: any;
  public _options: any;
  public _inBatch: any;
  public _stream: any;
  public _state: any;
  public _feeds: any;
  public _feedsToSync: any;
  public _initialState: any;
  public feed: any;
  public path: any;
  public metadata: any;

  /**
   * constructor
   *
   * @param filter Filter function to return options for each feed.createReadStream
   * (returns `false` will ignore the feed) or default object options for each feed.createReadStream(options)
   */
  constructor (filter: any, inBatch = false) {
    assert(typeof filter === 'function' || typeof filter === 'object');

    if (typeof filter === 'function') {
      this._filter = filter;
      this._options = {};
    } else {
      this._filter = all;
      this._options = filter;
    }

    this._inBatch = inBatch;
    this._stream = multi.obj({ autoDestroy: false });
    this._stream.sync = () => this.sync;
    this._stream.state = () => this._state;

    this._feeds = new Set();
    this._feedsToSync = new Set();
    this._initialState = {};
    this._state = {};
  }

  get stream (): ReadableStream {
    return this._stream;
  }

  get sync () {
    return this._feedsToSync.size === 0;
  }

  get state () {
    return this._state;
  }

  /**
   * Destroy stream.
   */
  destroy (err: Error) {
    process.nextTick(() => {
      this._stream.destroy(err);
    });
  }

  async addInitialFeedStreams (descriptors: FeedDescriptor[]) {
    const validFeeds = await Promise.all(descriptors.map(async descriptor => {
      const streamOptions = await this._getFeedStreamOptions(descriptor);
      if (!streamOptions || !descriptor.key) {
        return null;
      }

      const feedKey = descriptor.key.toString('hex');

      this._state[feedKey] = 0;

      // feeds to sync
      if (descriptor.feed && descriptor.feed.length > 0) {
        this._feedsToSync.add(feedKey);
        this._initialState[feedKey] = 0;
      }

      return { descriptor, streamOptions };
    }));

    const notNull = <T>(value: T | null): value is T => Boolean(value);

    validFeeds.filter(notNull).forEach(({ descriptor, streamOptions }) => {
      this._addFeedStream(descriptor, streamOptions);
    });

    // empty feedsToSync
    if (this.sync) {
      this._stream.emit('sync', this._initialState);
    }
  }

  /**
   * Adds a feed stream and stream the block data, seq, key and metadata.
   */
  async addFeedStream (descriptor: FeedDescriptor) {
    let streamOptions = await this._getFeedStreamOptions(descriptor);
    if (!streamOptions || !descriptor.key) {
      return false;
    }

    const feedKey = descriptor.key.toString('hex');
    if (streamOptions.live && this._state[feedKey]) {
      streamOptions = {
        ...streamOptions,
        start: this._state[feedKey] + 1,
        end: streamOptions.end && streamOptions.end >= this._state[feedKey] ? streamOptions.end : undefined
      };
    }

    this._addFeedStream(descriptor, streamOptions);

    return true;
  }

  /**
   * Execute a callback on end of the stream.
   */
  onEnd (callback: (err: Error | null | undefined) => void) {
    eos(this._stream, (err) => {
      callback(err);
    });
  }

  private _checkFeedSync (feed: any, seq: any, sync = false) {
    const feedKey = feed.key.toString('hex');
    this._state[feedKey] = seq;
    if (this.sync) {
      return;
    }
    if (sync && this._feedsToSync.has(feedKey)) {
      this._initialState[feedKey] = seq;
      this._feedsToSync.delete(feedKey);
      if (this.sync) {
        this._stream.emit('sync', this._initialState);
      }
    }
  }

  private async _getFeedStreamOptions (descriptor: FeedDescriptor) {
    const { feed } = descriptor;

    if (!feed || this._feeds.has(feed) || this._stream.destroyed) {
      return false;
    }

    const streamOptions = await this._filter(descriptor);
    if (!streamOptions) {
      return false;
    }

    if (typeof streamOptions === 'object') {
      return { ...this._options, ...streamOptions };
    }

    return { ...this._options };
  }

  private _addFeedStream (descriptor: FeedDescriptor, streamOptions: any) {
    const { feed, key, metadata } = descriptor;

    streamOptions.metadata = { key, metadata };

    const transform = through.obj((messages, _, next) => {
      if (this._inBatch) {
        transform.push(messages);
      } else {
        for (const message of messages) {
          transform.push(message);
        }
      }

      const last = messages[messages.length - 1];
      this._checkFeedSync(feed, last.seq, last.sync);
      next();
    });

    const stream = pump(createBatchStream(feed, streamOptions), transform);

    eos(stream, () => {
      this._feeds.delete(feed);
    });

    this._stream.add(stream);
    this._feeds.add(feed);
  }
}
