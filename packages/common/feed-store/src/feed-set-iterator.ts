//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event, EventSubscriptions, Trigger } from '@dxos/async';
import { FeedBlock as HypercoreFeedBlock } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, isNotNullOrUndefined } from '@dxos/util';

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
  start?: FeedIndex[]
  stallTimeout?: number
}

export const defaultFeedSetIteratorOptions = {
  stallTimeout: 1000
};

/**
 * Iterator that reads blocks from multiple feeds, ordering them based on a traversal callback.
 */
export class FeedSetIterator<T extends {}> extends AbstractFeedIterator<T> {
  private readonly _feedQueues = new ComplexMap<PublicKey, FeedQueue<T>>(PublicKey.hash);
  private readonly _trigger = new Trigger({ autoReset: true });
  private readonly _subscriptions = new EventSubscriptions();

  public readonly stalled = new Event<FeedSetIterator<T>>();

  constructor (
    private readonly _selector: FeedBlockSelector<T>,
    public readonly options: FeedSetIteratorOptions = defaultFeedSetIteratorOptions
  ) {
    super();
    assert(_selector);
    assert(options);
  }

  override toJSON () {
    return {
      open: this.isOpen,
      running: this.isRunning,
      feeds: this._feedQueues.size
    };
  }

  get size () {
    return this._feedQueues.size;
  }

  get feeds (): FeedWrapper<T>[] {
    return Array.from(this._feedQueues.values()).map(feedQueue => feedQueue.feed);
  }

  get indexes (): FeedIndex[] {
    return Array.from(this._feedQueues.values()).map(feedQueue => ({
      feedKey: feedQueue.feed.key,
      index: feedQueue.index
    }));
  }

  // TODO(burdon): Testing only?
  get end (): FeedIndex[] {
    return Array.from(this._feedQueues.values())
      .filter(queue => queue.length > 0)
      .map(feedQueue => ({
        feedKey: feedQueue.feed.key,
        index: feedQueue.length - 1
      }));
  }

  async addFeed (feed: FeedWrapper<T>) {
    assert(!this._feedQueues.has(feed.key), `Feed already added: ${feed.key}`);
    assert(feed.properties.opened);
    log('feed added', { feed: feed.key });

    const queue = new FeedQueue<T>(feed);
    this._subscriptions.add(queue.updated.on(() => {
      console.log('!!!!!!!!!!!!!!');
      this._trigger.wake();
    }));

    this._feedQueues.set(feed.key, queue);
    await queue.open();

    // Wake when feed added or queue updated.
    this._trigger.wake();
  }

  override async _onOpen (): Promise<void> {
    for (const queue of this._feedQueues.values()) {
      await queue.open();
    }
  }

  override async _onClose (): Promise<void> {
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    this._subscriptions.clear();
    for (const queue of this._feedQueues.values()) {
      await queue.close();
    }

    console.log('???', this.toJSON());

    // Wake when feed added or queue updated.
    this._trigger.wake();
  }

  override async _nextBlock (): Promise<FeedBlock<T> | undefined> {
    let t: NodeJS.Timeout | undefined;
    while (this._running) {
      const queues = Array.from(this._feedQueues.values());
      const blocks = queues.map(queue => queue.peek()).filter(isNotNullOrUndefined);
      if (blocks.length) {
        // Get selected block from candidates.
        const idx = this._selector(blocks);
        if (idx === undefined) {
          log.warn('Stalled', { blocks });
          // Timeout if all candidates are rejected.
          if (t === undefined) {
            t = setTimeout(() => {
              this.stalled.emit(this);
            }, this.options.stallTimeout);
          }
        } else {
          if (t !== undefined) {
            clearTimeout(t);
            t = undefined;
          }
          if (idx >= blocks.length) {
            throw new Error(`Index out of bounds: ${idx} of ${blocks.length}`);
          }

          // Pop from queue.
          const queue = this._feedQueues.get(blocks[idx].key)!;
          const message = await queue.pop();
          assert(message);
          return message;
        }
      }

      // Wait until feed added, new block, or closing.
      await this._trigger.wait();
      log('WOKEN', { this: this.toJSON() });
    }
  }
}
