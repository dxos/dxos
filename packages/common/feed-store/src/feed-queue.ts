//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';
import { Writable } from 'streamx';

import { Event, latch, Trigger } from '@dxos/async';
import { inspectObject } from '@dxos/debug';
import type { ReadStreamOptions } from '@dxos/hypercore';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type FeedWrapper } from './feed-wrapper';
import { type FeedBlock } from './types';

export const defaultReadStreamOptions: ReadStreamOptions = {
  live: true, // Keep reading until closed.
  batch: 1024, // Read in batches.
};

export type FeedQueueOptions = {};

/**
 * Async queue using an AsyncIterator created from a hypercore.
 */
export class FeedQueue<T extends {}> {
  public updated = new Event<FeedQueue<T>>();

  private readonly _messageTrigger = new Trigger<FeedBlock<T>>({
    autoReset: true,
  });

  private _feedConsumer?: Writable = undefined;
  private _next?: () => void;
  private _currentBlock?: FeedBlock<T> = undefined;
  private _index = -1;

  // prettier-ignore
  constructor(
    private readonly _feed: FeedWrapper<T>,
    private readonly _options: FeedQueueOptions = {},
  ) {}

  [inspect.custom](): string {
    return inspectObject(this);
  }

  toJSON() {
    return {
      feedKey: this._feed.key,
      index: this.index,
      length: this.length,
      open: this.isOpen,
    };
  }

  get feed() {
    return this._feed;
  }

  get isOpen(): boolean {
    return Boolean(this._feedConsumer);
  }

  get length(): number {
    return this._feed.properties.length;
  }

  /**
   * Index (seq) of the NEXT block to be read, or -1 if not open.
   */
  get index() {
    return this._index;
  }

  /**
   * Opens (or reopens) the queue.
   * @param options.start Starting index. First mutation to be read would have `seq == options.start`.
   */
  async open(options: ReadStreamOptions = {}): Promise<void> {
    if (this.isOpen) {
      // TODO(burdon): Warn if re-opening (e.g., with different starting point).
      return;
    }

    this._index = options.start ?? 0;
    // if (this._index !== 0) {
    //   console.warn('Start index not yet supported.');
    // }

    log('opening', { feedKey: this._feed.key });

    // TODO(burdon): Open with starting range.
    const opts = Object.assign({}, defaultReadStreamOptions, options);
    const feedStream = this._feed.createReadableStream(opts);

    this._feedConsumer = new Writable({
      write: (data: any, next: () => void) => {
        this._next = () => {
          this._next = undefined;
          this._currentBlock = undefined;
          this._index++;
          next();
        };

        this._currentBlock = {
          feedKey: this._feed.key,
          seq: this._index,
          data,
        };

        this._messageTrigger.wake(this._currentBlock);
        this.updated.emit(this);
      },
    });

    const onClose = () => {
      this.feed.core.off('close', onClose);
      this._feedConsumer?.off('close', onClose);
      this._feedConsumer?.off('error', onError);

      this._destroyConsumer();
    };

    const onError = (err?: Error) => {
      if (!err) {
        return;
      }

      if (err.message === 'Writable stream closed prematurely' || err.message === 'Feed is closed') {
        return;
      }

      log.catch(err, { feedKey: this._feed.key });
    };

    // Called if feed is closed externally.
    this._feed.core.once('close', onClose);
    this._feedConsumer.on('error', onError);

    // Called when queue is closed. Throws exception if waiting for `pop`.
    this._feedConsumer.once('close', onClose);

    // Pipe readable stream into writable consumer.
    feedStream.pipe(this._feedConsumer, (err) => {
      if (err) {
        onError(err);
      }
      this._destroyConsumer();
    });

    log('opened');
  }

  /**
   * Closes the queue.
   */
  async close(): Promise<void> {
    if (this.isOpen) {
      invariant(this._feedConsumer);
      invariant(!this._feed.properties.closed);

      log('closing', { feedKey: this._feed.key });
      const [closed, setClosed] = latch();
      this._feedConsumer.once('close', setClosed);
      this._feedConsumer.destroy();
      this._next?.(); // Release any message currently in the queue (otherwise destroy will block).
      await closed();
      log('closed');
    }
  }

  /**
   * Get the block at the head of the queue without removing it.
   */
  peek(): FeedBlock<T> | undefined {
    return this._currentBlock;
  }

  /**
   * Pop block at the head of the queue.
   */
  async pop(): Promise<FeedBlock<T>> {
    if (!this.isOpen) {
      throw new Error(`Queue closed: ${this.feed.key.truncate()}`);
    }

    let block = this.peek();
    if (!block) {
      block = await this._messageTrigger.wait();
    }

    if (block) {
      this._next?.();
    }

    return block;
  }

  private _destroyConsumer(): void {
    if (this._feedConsumer) {
      log('queue closed', { feedKey: this._feed.key });
      this._feedConsumer = undefined;
      this._next = undefined;
      this._currentBlock = undefined;
      this._index = -1;
    }
  }
}
