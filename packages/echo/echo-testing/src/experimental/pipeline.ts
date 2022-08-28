//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import faker from 'faker';

import { sleep } from '@dxos/async';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';

export class Timeframe {}

export type Message = Buffer;

export const encode = (obj: any) => Buffer.from(JSON.stringify(obj));
export const decode = (data: Buffer) => JSON.parse(data.toString());

const log = debug('dxos:test:pipeline');

export interface StateMachine<T> {
  execute (message: T): void
}

/**
 * Hypercore abstraction.
 */
export class Feed {
  readonly key = PublicKey.random();
  readonly _messages: Message[] = [];

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

export enum FeedType {
  INVALID = 0,
  GENESIS = 1,
  WRITABLE = 2,
  READABLE = 3
}

export class FeedDescriptor {
  constructor (
    readonly type: FeedType = FeedType.READABLE,
    readonly feed: Feed = new Feed()
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

  toString () {
    const feeds = Array.from(this._descriptors.entries())
      .map(([key, { feed, type }]) => `${truncateKey(key)}[${type}]=${feed.length}`);
    return `FeedStore(${feeds.join(', ')})`;
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
  _running = false;
  _feedIndexMap = new Map<PublicKey, number>();

  constructor (
    private readonly _store: FeedStore
  ) {}

  toString () {
    const array = Array.from(this._feedIndexMap.entries()).map(([key, value]) => [truncateKey(key), value]);
    return `MessageIterator(${array.map(([key, value]) => `${key}:${value}`).join(', ')})`;
  }

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
    this._running = true;

    // Select next message.
    while (this._running) {
      const candidates: Feed[] = this._store.getFeedDescriptors()
        .filter(({ feed }) => (this._feedIndexMap.get(feed.key) ?? 0) < feed.length)
        .map(({ feed }) => feed);

      if (candidates.length) {
        const feed = faker.random.arrayElement(candidates);
        const i = this._feedIndexMap.get(feed.key) ?? 0;
        const message = feed.getMessage(i);
        this._feedIndexMap.set(feed.key, i + 1);
        yield [message, feed.key, i];
      } else {
        // TODO(burdon): Wait for feed event.
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
