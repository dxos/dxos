//
// Copyright 2019 DXOS.org
//

import { Readable } from 'stream';

import createBatchStream from './create-batch-stream';
import type { FeedDescriptor } from './feed-descriptor';

/**
 * Creates a multi ReadableStream for feed streams.
 */
export default class SelectiveReader extends Readable {
	private _needsData: boolean;
  private _evaluator: (fd: FeedDescriptor, message: object) => Promise<boolean>;
  private _feeds: Set<{ descriptor: FeedDescriptor, stream: any, buffer: any[] }>;
  private _wakeUpReader?: () => void;
  private _hasData?: Promise<void>;

  _reading = false;

  constructor (evaluator: (fd: FeedDescriptor, message: object) => Promise<boolean>) {
    super({ objectMode: true });

    this._evaluator = evaluator;
    this._resetDataLock();
    this._feeds = new Set();
    this._needsData = false;
  }

  _resetDataLock () {
    this._hasData = new Promise<void>(resolve => {
      this._wakeUpReader = resolve;
    });
  }

  override async _read () {
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
          if (!messages) {
            continue;
          }
          feed.buffer.push(...messages);
        }

        let message;
        while ((message = feed.buffer.shift())) {
          if (await this._evaluator(feed.descriptor, message)) {
            process.nextTick(() => {
              if (this._wakeUpReader) {
                this._wakeUpReader();
              }
            });
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

  async addInitialFeedStreams (descriptors: FeedDescriptor[]) {
    for (const descriptor of descriptors) {
      this.addFeedStream(descriptor);
    }
  }

  /**
   * Adds a feed stream and stream the block data, seq, key and metadata.
   */
  async addFeedStream (descriptor: FeedDescriptor) {
    const stream = createBatchStream(descriptor.feed, { live: true });

    stream.on('readable', () => {
      if (this._wakeUpReader) {
        this._wakeUpReader();
      }
      this._read();
    });

    this._feeds.add({ descriptor, stream, buffer: [] });
  }
}
