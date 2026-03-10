//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { TestFeedBuilder } from '../testing';

import { Pipeline } from './pipeline';

const TEST_MESSAGE: FeedMessage = {
  timeframe: new Timeframe(),
  payload: {},
};

describe('pipeline/Pipeline', () => {
  test('asynchronous reader & writer without ordering', async () => {
    const ctx = Context.default();
    const pipeline = new Pipeline();

    const builder = new TestFeedBuilder();
    const feedStore = builder.createFeedStore();

    // Remote feeds from other peers.
    const numFeeds = 5;
    const messagesPerFeed = 10;
    for (const _ in range(numFeeds)) {
      const key = await builder.keyring.createKey();
      const feed = await feedStore.openFeed(key, { writable: true });
      void pipeline.addFeed(ctx, feed);

      setTimeout(async () => {
        for (const _ in range(messagesPerFeed)) {
          await feed.append(TEST_MESSAGE);
        }
      });
    }

    // Local feed.
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    void pipeline.addFeed(ctx, feed);
    pipeline.setWriteFeed(ctx, feed);

    for (const _ in range(messagesPerFeed)) {
      await pipeline.writer!.write({});
    }

    await pipeline.start(ctx);

    let msgCount = 0;
    for await (const _ of pipeline.consume(ctx)) {
      if (++msgCount === numFeeds * messagesPerFeed) {
        void pipeline.stop(ctx);
      }
    }
  });

  test('reading and writing with cursor changes', async () => {
    const ctx = Context.default();
    const pipeline = new Pipeline();
    onTestFinished(() => pipeline.stop(ctx));

    const builder = new TestFeedBuilder();
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    await pipeline.addFeed(ctx, feed);

    const numMessages = 30;
    const sequenceNumbers: number[] = [];
    for (const _ of range(numMessages)) {
      const { seq } = await feed.appendWithReceipt(TEST_MESSAGE);
      sequenceNumbers.push(seq);
    }

    const processedSequenceNumbers: number[] = [];

    // Skip first 10, process the rest, and the repeat the last 10.
    const expectedSequenceNumbers = [...sequenceNumbers.slice(10, 30), ...sequenceNumbers.slice(20, 30)];

    await pipeline.setCursor(ctx, new Timeframe([[feed.key, 9]]));
    await pipeline.start(ctx);

    for await (const block of pipeline.consume(ctx)) {
      processedSequenceNumbers.push(block.seq);

      if (processedSequenceNumbers.length === 20) {
        // not awaited to avoid a deadlock.
        void pipeline.pause(ctx).then(async () => {
          await pipeline.setCursor(ctx, new Timeframe([[feed.key, 19]]));
          await pipeline.unpause(ctx);
        });
      }
      if (processedSequenceNumbers.length === 30) {
        void pipeline.stop(ctx);
      }
    }

    expect(processedSequenceNumbers).toEqual(expectedSequenceNumbers);
  });

  test('cursor change while polling', async () => {
    const ctx = Context.default();
    const pipeline = new Pipeline();
    onTestFinished(() => pipeline.stop(ctx));

    const builder = new TestFeedBuilder();
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    await pipeline.addFeed(ctx, feed);

    for (const _ of range(20)) {
      await feed.appendWithReceipt(TEST_MESSAGE);
    }
    await feed.clear(0, 10);

    const processedSequenceNumbers: number[] = [];
    const expectedSequenceNumbers = range(20).slice(10);
    const processedEvent = new Event();
    setTimeout(async () => {
      for await (const block of pipeline.consume(ctx)) {
        processedSequenceNumbers.push(block.seq);
        processedEvent.emit();
      }
    });

    await pipeline.start(ctx);
    await sleep(1000);

    await pipeline.pause(ctx);
    await pipeline.setCursor(ctx, new Timeframe([[feed.key, 9]]));
    await pipeline.unpause(ctx);

    await processedEvent.waitForCondition(() => processedSequenceNumbers.length === 10);
    expect(processedSequenceNumbers).toEqual(expectedSequenceNumbers);
  });
});
