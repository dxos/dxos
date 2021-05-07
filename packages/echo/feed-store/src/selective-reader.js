//
// Copyright 2019 DXOS.org
//

import { Readable } from 'stream';
import createBatchStream from './create-batch-stream';

/**
 * Creates a multi ReadableStream for feed streams.
 */
export default class SelectiveReader extends Readable {
  /** @type {(feedDescriptor, message) => Promise<boolean>} */
  _evaluator;

  /** @type {Set<{ descriptor: FeedDescriptor, stream: any, buffer: any[] }>} */
  _feeds = new Set();

  /** @type {() => void} */
  _wakeUpReader;

  /** @type {Promise} */
  _hasData;

  _reading = false;

  constructor (evaluator) {
    super({ objectMode: true });

    this._evaluator = evaluator;
    this._resetDataLock();
  }

  _resetDataLock () {
    this._hasData = new Promise(resolve => { this._wakeUpReader = resolve; });
  }

  async _read () {
    if (this._reading) {
      this._needsData = true;
      return;
    }
    this._reading = true;
    this._needsData = false;

    while (true) {
      this._resetDataLock();

      for (const feed of this._feeds.values()) {
        if (feed.buffer.length === 0) {
          const messages = feed.stream.read();
          if (!messages) continue;
          feed.buffer.push(...messages);
        }

        let message;
        while ((message = feed.buffer.shift())) {
          if (await this._evaluator(feed.descriptor, message)) {
            process.nextTick(() => this._wakeUpReader());
            this._needsData = false;
            if (!this.push(message)) {
              this._reading = false;
              return;
            }
          } else {
            feed.buffer.unshift(message);
            break;
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 0)); // yield so that other tasks can be processed

      if (this._needsData && Array.from(this._feeds.values()).some(x => x.buffer.length > 0)) {
        continue;
      }
      await this._hasData;
    }
  }

  async addInitialFeedStreams (descriptors) {
    for (const descriptor of descriptors) {
      this.addFeedStream(descriptor);
    }
  }

  /**
   * Adds a feed stream and stream the block data, seq, key and metadata.
   *
   * @param {FeedDescriptor} descriptor
   */
  async addFeedStream (descriptor) {
    const stream = createBatchStream(descriptor.feed, { live: true });

    stream.on('readable', () => {
      this._wakeUpReader();
      this._read();
    });

    this._feeds.add({ descriptor, stream, buffer: [] });
  }
}
