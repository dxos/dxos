//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

export class Timeframe {}

export type Message = Buffer;

export const encode = (obj: any) => Buffer.from(JSON.stringify(obj));
export const decode = (data: Buffer) => JSON.parse(data.toString());

export interface StateMachine<T> {
  execute (message: T): void
}

/**
 * Hypercore abstraction.
 */
export class Feed {
  private readonly _messages: Message[] = [];

  readonly key = PublicKey.random();

  get length () {
    return this._messages.length;
  }

  getMessage (i: number) {
    return this._messages[i];
  }

  append (message: Message) {
    this._messages.push(message);
  }
}

/**
 * Memory/Persistent feed store abstraction.
 */
export class FeedStore {
  private readonly _feeds: Feed[] = [];

  addFeed (feed: Feed) {
    this._feeds.push(feed);
  }

  getFeeds (): Feed[] {
    return this._feeds;
  }
}

export type MessageMeta = [
  message: Message,
  feedKey: PublicKey,
  index: number
]

/**
 * Consumes feeds and generates total order across messages.
 */
export class MessageIterator {
  _running = true;
  _feedIndexMap = new Map<PublicKey, number>();

  constructor (
    private readonly _store: FeedStore
  ) {}

  stop () {
    this._running = false;
  }

  getTimeframe () {
    return new Timeframe();
  }

  /**
   * Generator that returns the next ordered message.
   */
  async * reader (): AsyncIterableIterator<MessageMeta> {
    // TODO(burdon): Select next message.
    while (this._running) {
      const candidates = this._store.getFeeds().filter(feed => {
        const i = this._feedIndexMap.get(feed.key) ?? 0;
        return feed.length > i;
      });

      // TODO(burdon): Trigger on feed/feedstore event.
      if (candidates.length) {
        const feed = faker.random.arrayElement(candidates);
        const i = this._feedIndexMap.get(feed.key) ?? 0;
        const message = feed.getMessage(i);
        this._feedIndexMap.set(feed.key, i + 1);
        yield [message, feed.key, i];
      } else {
        await sleep(100);
      }
    }
  }
}

export type PipelineOptions = {
  writable?: boolean
}

/**
 * Main pipeline.
 * NOTE: NO dependencies on HALO, Credentials, Space, etc.
 */
export class Pipeline {
  readonly writableFeed?: Feed;
  readonly feedStore = new FeedStore();
  readonly messageIterator = new MessageIterator(this.feedStore);

  constructor ({ writable = false }: PipelineOptions = {}) {
    this.writableFeed = writable ? new Feed() : undefined;
    if (this.writableFeed) {
      this.feedStore.addFeed(this.writableFeed);
    }
  }

  toString () {
    return `Pipeline(${JSON.stringify({ feeds: this.feedStore.getFeeds().length })})`;
  }
}
