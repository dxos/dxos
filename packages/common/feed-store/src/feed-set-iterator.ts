//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedBlock as HypercoreFeedBlock } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { AbstractFeedIterator } from './feed-iterator';
import { FeedQueue, Trigger } from './feed-queue';
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
 * Iterator that reads blocks from multiple feeds, ordering them based on a traversal callback.
 */
export class FeedSetIterator<T = {}> extends AbstractFeedIterator<T> {
  private readonly _feedQueues = new ComplexMap<PublicKey, FeedQueue<T>>(PublicKey.hash);
  private readonly _trigger = new Trigger(this.options.timeout);
  private readonly _subscriptions = new SubscriptionGroup();

  public readonly stalled = new Event<FeedSetIterator<T>>();

  constructor (
    private readonly _selector: FeedBlockSelector<T>,
    public readonly options: FeedSetIteratorOptions = defaultFeedSetIteratorOptions
  ) {
    super();
    assert(_selector);

    (this._trigger as any).label = 'iterator';
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

  async addFeed (feed: FeedWrapper<T>) {
    assert(feed.properties.opened);
    const queue = new FeedQueue<T>(feed);
    await queue.open();
    this._feedQueues.set(feed.key, queue);

    // Wake when feed added or queue updated.
    this._trigger.wake();
    this._subscriptions.add(queue.updated.on(() => {
      this._trigger.wake();
    }));
  }

  override async _onOpen (): Promise<void> {
    for (const queue of this._feedQueues.values()) {
      await queue.open();
    }
  }

  override async _onClose (): Promise<void> {
    this._subscriptions.unsubscribe();
    for (const queue of this._feedQueues.values()) {
      await queue.close();
    }
  }

  override async _nextBlock (): Promise<FeedBlock<T> | undefined> {
    while (this._running) {
      const queues = Array.from(this._feedQueues.values());
      const blocks = queues.map(queue => queue.peek()).filter(Boolean) as FeedBlock<T>[];
      if (blocks.length) {
        // Get selected block from candidates.
        const idx = this._selector(blocks);
        if (idx !== undefined) {
          if (idx >= blocks.length) {
            throw new Error(`Index out of bounds: ${idx} of ${blocks.length}`);
          }

          // Pop from queue.
          const queue = this._feedQueues.get(blocks[idx].key)!;
          const next = await queue.pop();
          assert(next);
          return next;
        }
      }

      try {
        // Wait until new feed added or new block.
        await this._trigger.wait();
      } catch (err) {
        // TODO(burdon): Stalled should only be triggered if we know there's unconsumed data.
        this.stalled.emit(this);
      }
    }
  }
}
