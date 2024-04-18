//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Event, sleep } from '@dxos/async';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';
import { describe, test } from 'vitest';

import { TestFeedBuilder } from '../testing';
import { Pipeline } from './pipeline';

const TEST_MESSAGE: FeedMessage = {
  timeframe: new Timeframe(),
  payload: {},
};

describe('pipeline/Pipeline', () => {
  test('asynchronous reader & writer without ordering', async () => {
    const pipeline = new Pipeline();

    const builder = new TestFeedBuilder();
    const feedStore = builder.createFeedStore();

    // Remote feeds from other peers.
    const numFeeds = 5;
    const messagesPerFeed = 10;
    for (const _ in range(numFeeds)) {
      const key = await builder.keyring.createKey();
      const feed = await feedStore.openFeed(key, { writable: true });
      void pipeline.addFeed(feed);

      setTimeout(async () => {
        for (const _ in range(messagesPerFeed)) {
          await feed.append(TEST_MESSAGE);
        }
      });
    }

    // Local feed.
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    void pipeline.addFeed(feed);
    pipeline.setWriteFeed(feed);

    for (const _ in range(messagesPerFeed)) {
      await pipeline.writer!.write({});
    }

    await pipeline.start();

    let msgCount = 0;
    for await (const _ of pipeline.consume()) {
      if (++msgCount === numFeeds * messagesPerFeed) {
        void pipeline.stop();
      }
    }
  });

  test('reading and writing with cursor changes', async ({ onTestFinished }) => {
    const pipeline = new Pipeline();
    onTestFinished(() => pipeline.stop());

    const builder = new TestFeedBuilder();
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    await pipeline.addFeed(feed);

    const numMessages = 30;
    const sequenceNumbers: number[] = [];
    for (const _ of range(numMessages)) {
      const { seq } = await feed.appendWithReceipt(TEST_MESSAGE);
      sequenceNumbers.push(seq);
    }

    const processedSequenceNumbers: number[] = [];

    // Skip first 10, process the rest, and the repeat the last 10.
    const expectedSequenceNumbers = [...sequenceNumbers.slice(10, 30), ...sequenceNumbers.slice(20, 30)];

    await pipeline.setCursor(new Timeframe([[feed.key, 9]]));
    await pipeline.start();

    for await (const block of pipeline.consume()) {
      processedSequenceNumbers.push(block.seq);

      if (processedSequenceNumbers.length === 20) {
        // not awaited to avoid a deadlock.
        void pipeline.pause().then(async () => {
          await pipeline.setCursor(new Timeframe([[feed.key, 19]]));
          await pipeline.unpause();
        });
      }
      if (processedSequenceNumbers.length === 30) {
        void pipeline.stop();
      }
    }

    expect(processedSequenceNumbers).toEqual(expectedSequenceNumbers);
  });

  test('cursor change while polling', async ({ onTestFinished }) => {
    const pipeline = new Pipeline();
    onTestFinished(() => pipeline.stop());

    const builder = new TestFeedBuilder();
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    await pipeline.addFeed(feed);

    for (const _ of range(20)) {
      await feed.appendWithReceipt(TEST_MESSAGE);
    }
    await feed.clear(0, 10);

    const processedSequenceNumbers: number[] = [];
    const expectedSequenceNumbers = range(20).slice(10);
    const processedEvent = new Event();
    setTimeout(async () => {
      for await (const block of pipeline.consume()) {
        processedSequenceNumbers.push(block.seq);
        processedEvent.emit();
      }
    });

    await pipeline.start();
    await sleep(1000);

    await pipeline.pause();
    await pipeline.setCursor(new Timeframe([[feed.key, 9]]));
    await pipeline.unpause();

    await processedEvent.waitForCondition(() => processedSequenceNumbers.length === 10);
    expect(processedSequenceNumbers).toEqual(expectedSequenceNumbers);
  });
});
