//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import assert from 'node:assert';

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

  constructor (
    readonly writable = false
  ) {}

  get length () {
    return this._messages.length;
  }

  getMessage (i: number) {
    return this._messages[i];
  }

  append (message: Message) {
    assert(this.writable);
    this._messages.push(message);
  }
}

export enum FeedType {
  GENESIS,
  WRITABLE,
  READABLE
}

export class FeedDescriptor {
  constructor (
    readonly type: FeedType = FeedType.READABLE,
    readonly feed: Feed = new Feed(type !== FeedType.READABLE)
  ) {}
}

/**
 * Manages a set of Feeds.
 * NOTE: This is specific to an invidiual space.
 */
export class FeedStore {
  private readonly _descriptors = new Map<PublicKey, FeedDescriptor>();

  constructor (
    feeds: FeedDescriptor[] = []
  ) {
    feeds.forEach(feed => this.addFeed(feed));
  }

  addFeed (descriptor: FeedDescriptor) {
    this._descriptors.set(descriptor.feed.key, descriptor);
    return this;
  }

  getFeedDescriptors (): FeedDescriptor[] {
    return Array.from(this._descriptors.values());
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
      const candidates: Feed[] = this._store.getFeedDescriptors()
        .filter(({ feed }) => {
          const i = this._feedIndexMap.get(feed.key) ?? 0;
          return feed.length > i;
        })
        .map(({ feed }) => feed);

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

/**
 * Main pipeline.
 * NOTE: NO dependencies on HALO, Credentials, Space, etc.
 */
export class Pipeline {
  readonly messageIterator;

  constructor (
    readonly feedStore: FeedStore,
    readonly writable?: Feed
  ) {
    this.messageIterator = new MessageIterator(this.feedStore);
  }

  toString () {
    return `Pipeline(${JSON.stringify({ feeds: this.feedStore.getFeedDescriptors().length })})`;
  }
}
