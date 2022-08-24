//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { sleep } from '@dxos/async';

class Timeframe {}

type Message = Buffer;

class Feed {
  private readonly _key = faker.datatype.uuid();
  private readonly _messages: Message[] = [];

  get key () {
    return this._key;
  }

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

class FeedStore {
  private readonly _feeds: Feed[] = [];

  addFeed (feed: Feed) {
    this._feeds.push(feed);
  }

  getFeeds (): Feed[] {
    return this._feeds;
  }
}

class FeedIterator {
  _running = true;
  _feedIndexMap = new Map<string, number>();

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
  async * reader (): AsyncIterableIterator<Message> {
    // TODO(burdon): Select next message.
    while (this._running) {
      const candidates = this._store.getFeeds().filter(feed => {
        const i = this._feedIndexMap.get(feed.key) ?? 0;
        return feed.length > i;
      });

      if (candidates.length) {
        const feed = faker.random.arrayElement(candidates);
        const i = this._feedIndexMap.get(feed.key) ?? 0;
        const message = feed.getMessage(i);
        this._feedIndexMap.set(feed.key, i + 1);
        yield message;
      } else {
        await sleep(100);
      }
    }
  }
}

class Pipeline {

}

describe.only('Stack', () => {
  // TODO(burdon): Parts of the pipeline.
  test('Pipeline multi-reader', async () => {
    const fs = new FeedStore();

    // TODO(burdon): Order by timeframe.
    const it = new FeedIterator(fs);

    // Create feeds.
    Array.from({ length: 10 }).forEach(() => fs.addFeed(new Feed()));

    // Write a message.
    const numMessages = 100;
    setImmediate(async () => {
      for (let i = 0; i < numMessages; i++) {
        // TODO(burdon): Should select the writable feed from one of the pipelines.
        const feed = faker.random.arrayElement(fs.getFeeds());
        feed.append(Buffer.from(JSON.stringify({
          timeframe: it.getTimeframe(),
          data: faker.datatype.string(16)
        })));

        await sleep(79);
      }
    });

    // Consume messages.
    // TODO(burdon): ISSUE: What if discover out of order? Replay?
    let count = 0;
    for await (const message of it.reader()) {
      console.log(`Message[${String(count).padStart(4, '0')}] = ${message.length}`);
      if (++count === numMessages) {
        it.stop();
      }
    }

    expect(true).toBeTruthy();
  });

  // Phase 1: Pipeline Abstraction
  // TODO(burdon): Pipeline abstraction with multiple "peers" (and single writable feed).
  // TODO(burdon): Replication.
  // TODO(burdon): Auth state machine.

  // Phase 2
  // TODO(burdon): Genesis (incl. device joining).
  // TODO(burdon): Cold start.
  // TODO(burdon): Invitations and device joining (credential state machine).
  // TODO(burdon): Invitations and member joining.

  // Phase 3
  // TODO(burdon): Space items.
  // TODO(burdon): Strongly typed items.
  // TODO(burdon): Epochs.
});
