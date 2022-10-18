//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { sleep } from '@dxos/async';
import { FeedBlock as HypercoreFeedBlock } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
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
  polling?: number
  // TODO(burdon): Should we remove this and assume the feeds are positioned before adding?
  //  Currently does not use this.
  start?: FeedIndex[]
}

export const defaultFeedSetIteratorOptions = {
  polling: 1000
};

/**
 * Iterator that reads blocks from multiple feeds in timeframe order.
 */
export class FeedSetIterator<T = {}> extends AbstractFeedIterator<T> {
  private readonly _feedQueues = new ComplexMap<PublicKey, FeedQueue<T>>(PublicKey.hash);

  constructor (
    private readonly _selector: FeedBlockSelector<T>,
    private readonly _options: FeedSetIteratorOptions = defaultFeedSetIteratorOptions
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

  addFeed (feed: FeedWrapper) {
    this._feedQueues.set(feed.key, new FeedQueue(feed));
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

  override async _nextBlock (): Promise<FeedBlock<T> | undefined> {
    while (this._running) {
      // Get candidates.
      const queues = Array.from(this._feedQueues.values()).filter(queue => {
        return (queue.next < queue.length);
      });

      // Select feed.
      if (queues.length > 0) {
        const blocks = await Promise.all(queues.map(queue => queue.peek()!));
        const idx = this._selector(blocks);
        if (idx !== undefined) {
          if (idx >= blocks.length) {
            throw new Error(`Index out of bounds: ${idx} of ${blocks.length}`);
          }

          const queue = queues[idx];
          return queue.pop();
        }
      }

      // TODO(burdon): Replace polling with trigger (on new feed, message).
      log('Polling...');
      await sleep(this._options.polling ?? 1000);
    }
  }
}
