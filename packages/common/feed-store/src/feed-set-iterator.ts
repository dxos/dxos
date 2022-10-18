//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedBlock as HypercoreFeedBlock } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { AbstractFeedIterator } from './feed-iterator';
import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';

export type FeedBlock<T> = HypercoreFeedBlock<T>

/**
 * Select next block.
 */
export type FeedBlockSelector<T> = (blocks: FeedBlock<T>[]) => number | undefined

export type FeedIndex = {
  feedKey: PublicKey
  index: number
}

export type FeedSetIteratorOptions = {
  // TODO(burdon): Should we remove this and assume the feeds are positioned before adding?
  //  Currently does not use this.
  start?: FeedIndex[]
  timeout?: number
}

export const defaultFeedSetIteratorOptions = {
  timeout: 1000
};

/**
 * Iterator that reads blocks from multiple feeds in timeframe order.
 */
export class FeedSetIterator<T = {}> extends AbstractFeedIterator<T> {
  private readonly _feedQueues = new ComplexMap<PublicKey, FeedQueue<T>>(PublicKey.hash);
  private readonly _trigger = new Trigger(this.options.timeout);

  public readonly stalled = new Event<FeedSetIterator<T>>();

  constructor (
    private readonly _selector: FeedBlockSelector<T>,
    public readonly options: FeedSetIteratorOptions = defaultFeedSetIteratorOptions
  ) {
    super();
    assert(_selector);
  }

  get size () {
    return this._feedQueues.size;
  }

  get feeds (): FeedWrapper[] {
    return Array.from(this._feedQueues.values()).map(feedQueue => feedQueue.feed);
  }

  get indexes (): FeedIndex[] {
    return Array.from(this._feedQueues.values()).map(feedQueue => ({
      feedKey: feedQueue.feed.key,
      index: feedQueue.index
    }));
  }

  /**
   * Adds the feed to the iterator, then asynchronously opens it and adds it to the candidates.
   */
  addFeed (feed: FeedWrapper<T>) {
    assert(feed.properties.opened);
    setTimeout(async () => {
      const queue = new FeedQueue<T>(feed);
      await queue.open();
      this._feedQueues.set(feed.key, queue);
      this._trigger.wake();
    });
  }

  override async _onOpen (): Promise<void> {
    for (const queue of this._feedQueues.values()) {
      await queue.open();
    }
  }

  override async _onClose (): Promise<void> {
    for (const queue of this._feedQueues.values()) {
      await queue.close();
    }
  }

  // TODO(burdon): Iterator may not work since can't get update event.

  override async _nextBlock (): Promise<FeedBlock<T> | undefined> {
    console.log('############## next', this.indexes);
    while (this._running) {
      // Get candidates.
      const queues = Array.from(this._feedQueues.values()).filter(queue => {
        return (queue.index < queue.length);
      });

      // Select feed.
      if (queues.length > 0) {
        // TODO(burdon): This is wrong -- peeks shouldn't block.
        const blocks = await Promise.all(queues.map(queue => queue.peek()!));
        if (blocks.length) {
          const idx = this._selector(blocks);
          if (idx !== undefined) {
            if (idx >= blocks.length) {
              throw new Error(`Index out of bounds: ${idx} of ${blocks.length}`);
            }

            const queue = queues[idx];
            return queue.pop();
          }
        }
      }

      try {
        console.log('Waiting...', this.indexes);
        await this._trigger.wait();
        console.log('############ ok', this.indexes);
      } catch (err) {
        console.log(err);
        this.stalled.emit(this);
      }
    }
  }
}
