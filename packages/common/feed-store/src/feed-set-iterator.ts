//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { Event, SubscriptionList, Trigger } from '@dxos/async';
import { inspectObject } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, isNonNullable } from '@dxos/util';

import { AbstractFeedIterator } from './feed-iterator';
import { FeedQueue } from './feed-queue';
import { type FeedWrapper } from './feed-wrapper';
import { type FeedBlock } from './types';

/**
 * Select next block.
 */
export type FeedBlockSelector<T> = (blocks: FeedBlock<T>[]) => number | undefined;

export type FeedIndex = {
  feedKey: PublicKey;
  index: number;
};

export type FeedSetIteratorOptions = {
  // TODO(burdon): Should we remove this and assume the feeds are positioned before adding?
  start?: FeedIndex[];
  stallTimeout?: number;
};

export const defaultFeedSetIteratorOptions = {
  stallTimeout: 1000,
};

/**
 * Iterator that reads blocks from multiple feeds, ordering them based on a traversal callback.
 */
export class FeedSetIterator<T extends {}> extends AbstractFeedIterator<T> {
  private readonly _feedQueues = new ComplexMap<PublicKey, FeedQueue<T>>(PublicKey.hash);

  private readonly _trigger = new Trigger({ autoReset: true });
  private readonly _subscriptions = new SubscriptionList();

  public readonly stalled = new Event<FeedSetIterator<T>>();

  constructor(
    private readonly _selector: FeedBlockSelector<T>,
    public readonly options: FeedSetIteratorOptions = defaultFeedSetIteratorOptions,
  ) {
    super();
    invariant(_selector);
    invariant(options);
  }

  [inspect.custom](): string {
    return inspectObject(this);
  }

  override toJSON(): { open: boolean; running: boolean; indexes: FeedIndex[] } {
    return {
      open: this.isOpen,
      running: this.isRunning,
      indexes: this.indexes,
    };
  }

  get size() {
    return this._feedQueues.size;
  }

  get feeds(): FeedWrapper<T>[] {
    return Array.from(this._feedQueues.values()).map((feedQueue) => feedQueue.feed);
  }

  get indexes(): FeedIndex[] {
    return Array.from(this._feedQueues.values()).map((feedQueue) => ({
      feedKey: feedQueue.feed.key,
      index: feedQueue.index,
    }));
  }

  reiterateBlock(block: FeedBlock<T>): void {
    this._trigger.wake();
  }

  async addFeed(feed: FeedWrapper<T>): Promise<void> {
    invariant(!this._feedQueues.has(feed.key), `Feed already added: ${feed.key}`);
    invariant(feed.properties.opened);
    log('feed added', { feedKey: feed.key });

    // Create queue and listen for updates.
    const queue = new FeedQueue<T>(feed);
    this._feedQueues.set(feed.key, queue);
    this._subscriptions.add(
      queue.updated.on(() => {
        this._trigger.wake();
      }),
    );

    await queue.open({
      start: this.options.start?.find((index) => index.feedKey.equals(feed.key))?.index,
    });

    // Wake when feed added or queue updated.
    this._trigger.wake();
  }

  hasFeed(feedKey: PublicKey): boolean {
    return this._feedQueues.has(feedKey);
  }

  override async _onOpen(): Promise<void> {
    for (const queue of this._feedQueues.values()) {
      await queue.open();
    }
  }

  override async _onClose(): Promise<void> {
    this._subscriptions.clear();
    await Promise.all(Array.from(this._feedQueues.values()).map((queue) => queue.close()));

    // Wake when feed added or queue updated.
    this._trigger.wake();
  }

  /**
   * Gets the next block from the selected queue.
   */
  override async _nextBlock(): Promise<FeedBlock<T> | undefined> {
    let t: NodeJS.Timeout | undefined;

    while (this._running) {
      // Get blocks from the head of each queue.
      const queues = Array.from(this._feedQueues.values());
      const blocks = queues.map((queue) => queue.peek()).filter(isNonNullable);
      if (blocks.length) {
        // Get the selected block from candidates.
        const idx = this._selector(blocks);
        log('selected', { idx, blocks });
        if (idx === undefined) {
          // Timeout if all candidates are rejected.
          if (t === undefined) {
            t = setTimeout(() => {
              this.stalled.emit(this);
              this._trigger.wake();
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
          const queue = this._feedQueues.get(blocks[idx].feedKey)!;
          log('popping', queue.toJSON());
          try {
            const message = await queue.pop();
            invariant(message === blocks[idx]);
            return message;
          } catch (err) {
            // TODO(burdon): Same queue closed twice.
            log.warn('queue closed', { feedKey: queue.feed.key });
            // console.log(Array.from(this._feedQueues.values()));
          }
        }
      }

      // Wait until feed added, new block, or closing.
      await this._trigger.wait();
    }
  }
}
