//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { Feed } from 'hypercore';
import { Readable } from 'stream';

import { FeedStore, FeedDescriptor } from '@dxos/feed-store';

import { Trigger } from './util';

/**
 * We are using an iterator here instead of a stream to ensure we have full control over how and at what time data is read.
 * The reason for that is that the reader (PartyProcessor) has an effect via the feedSelector function over how data is generated.
 * NodeJS streams have intenal buffer that the system tends to eagerly fill.
 */
// TODO(burdon): Define type: dxos.echo.testing.FeedMessage
export class FeedStoreIterator implements AsyncIterable<{ data: any }> {
  static async create (feedStore: FeedStore, feedSelector: (feedKey: Buffer) => Promise<boolean>) {
    if (feedStore.closing || feedStore.closed) {
      throw new Error('FeedStore closed');
    }
    if (!feedStore.opened) {
      await feedStore.ready();
    }

    const existingDescriptors = feedStore.getDescriptors().filter(descriptor => descriptor.opened);

    const iterator = new FeedStoreIterator(feedSelector);
    for (const descriptor of existingDescriptors) {
      iterator._trackDescriptor(descriptor);
    }

    (feedStore as any).on('feed', (_: never, descriptor: FeedDescriptor) => {
      iterator._trackDescriptor(descriptor);
    });

    return iterator;
  }

  private readonly _candidateFeeds = new Set<FeedDescriptor>();
  private readonly _openFeeds = new Set<{ descriptor: FeedDescriptor, iterator: AsyncIterator<any>, frozen: boolean, sendQueue: any[] }>();
  private readonly _trigger = new Trigger();
  private _messageCount = 0; // needed for round-robin ordering
  private _destroyed = false;

  constructor (
    private readonly _feedSelector: (feedKey: Buffer) => Promise<boolean>
  ) { }

  private async _reevaluateFeeds () {
    for (const feed of this._openFeeds) {
      if (!await this._feedSelector(feed.descriptor.key)) {
        feed.frozen = true;
      }
    }

    for (const descriptor of Array.from(this._candidateFeeds.values())) { // snapshot cause we will be mutating the collection
      if (await this._feedSelector(descriptor.key)) {
        const stream = new Readable({ objectMode: true }).wrap((descriptor.feed as Feed).createReadStream({ live: true }));

        this._openFeeds.add({
          descriptor,
          iterator: stream[Symbol.asyncIterator](),
          frozen: false,
          sendQueue: []
        });

        this._candidateFeeds.delete(descriptor);
      }
    }
  }

  private _popSendQueue () {
    const openFeeds = Array.from(this._openFeeds.values());
    for (let i = 0; i < openFeeds.length; i++) {
      const idx = (this._messageCount + i) % openFeeds.length; // round-robin
      if (openFeeds[idx].frozen) { continue; }
      if (openFeeds[idx].sendQueue.length === 0) { continue; }
      return openFeeds[idx].sendQueue.shift();
    }

    return undefined;
  }

  private _pollFeeds () {
    for (const feed of this._openFeeds) {
      if (feed.sendQueue.length === 0) {
        feed.iterator.next().then(
          result => {
            assert(!result.done);
            feed.sendQueue.push(result.value);
            this._trigger.wake();
          },
          console.error // TODO(marik-d): Proper error handling
        );
      }
    }
  }

  private async _waitForData () {
    this._pollFeeds();
    await this._trigger.wait();
    this._trigger.reset();
  }

  async * _generator () {
    while (!this._destroyed) {
      while (true) {
        await this._reevaluateFeeds();

        const message = this._popSendQueue();
        if (!message) { break; }
        this._messageCount++;

        // TODO(burdon): Add feedKey (FeedMessage).
        yield {
          data: message
        };
      }

      await this._waitForData();
    }
  }

  private _generatorInstance = this._generator();

  /**
   * This gets called by "for await" loop to get the iterator instance that's then polled on each loop iteration.
   * We return a singleton here to ensure that the `_generator` function only gets called once.
   */
  [Symbol.asyncIterator] () {
    return this._generatorInstance;
  }

  private _trackDescriptor (descriptor: FeedDescriptor) {
    this._candidateFeeds.add(descriptor);
    this._trigger.wake();
  }

  destory () {
    this._destroyed = true;
    this._trigger.wake();
    // TODO(marik-d): Does this need to close the streams, or will they be garbage-collected automatically?
  }
}
