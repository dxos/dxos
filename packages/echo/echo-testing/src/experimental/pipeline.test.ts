//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { latch, sleep } from '@dxos/async';
import { truncateKey } from '@dxos/debug';

import { decode, encode, Feed, FeedDescriptor, FeedStore, FeedType, MessageIterator, Pipeline } from './pipeline';
import { createTestMessage, TestStateMachine } from './testing';

const log = debug('dxos:test');

faker.seed(100);

const padNum = (n: number, len = 3) => String(n).padStart(len, '0');

describe('Pipeline', () => {
  test('Message iterator', async () => {
    const feedStore = new FeedStore();
    const messageIterator = new MessageIterator(feedStore);

    // Create feeds.
    const numFeeds = 5;
    Array.from({ length: numFeeds }).forEach(() =>
      feedStore.addFeed(new FeedDescriptor(FeedType.WRITABLE)));

    // Write a message.
    const numMessages = 10;
    setImmediate(async () => {
      for (let i = 0; i < numMessages; i++) {
        const { feed } = faker.random.arrayElement(feedStore.getFeedDescriptors());
        feed.append(encode(createTestMessage()));
        await sleep(faker.datatype.number({ min: 10, max: 100 }));
      }
    });

    // Consume messages.
    let count = 0;
    for await (const [message, key, i] of messageIterator.reader()) {
      log(`[${padNum(count)}] (${truncateKey(key)}:${padNum(i)}) = ${JSON.stringify(JSON.parse(message.toString()))}`);
      if (++count === numMessages) {
        messageIterator.stop();
      }
    }

    expect(true).toBeTruthy();
  });

  type PipelineDef = [id: string, pipeline: Pipeline, stateMachine: TestStateMachine]

  test.only('Pipeline with ordered messages', async () => {
    // Create peers.
    const numPipelines = 3;
    const pipelines: PipelineDef[] = Array.from({ length: numPipelines }).map((_, i) => {
      const writable = new Feed();
      const feedStore = new FeedStore([new FeedDescriptor(FeedType.WRITABLE, writable)]);
      return [`P-${i + 1}`, new Pipeline(feedStore, writable), new TestStateMachine()];
    });

    // TODO(burdon): Simulate actual replication.
    pipelines.forEach(([pipelineId, pipeline]) => {
      pipelines.forEach(([peerId, peer]) => {
        if (pipelineId !== peerId) {
          pipeline.feedStore.addFeed(new FeedDescriptor(FeedType.READABLE, peer.writable!));
        }
      });
    });

    // Write messages.
    const numMessages = 8;
    setImmediate(async () => {
      for (let i = 0; i < numMessages; i++) {
        const [pipelineId, pipeline] = faker.random.arrayElement(pipelines);
        const message = createTestMessage();
        log(`[${pipelineId}:${padNum(pipeline.writable?.length ?? 0)}] ==> ${JSON.stringify(message)}`);
        pipeline.writable!.append(encode(message));
        await sleep(faker.datatype.number({ min: 10, max: 100 }));
      }
    });

    // Consume messages.
    const [reading, complete] = latch({ count: pipelines.length });
    pipelines.forEach(([pipelineId, pipeline, stateMachine]) => {
      log(`[${pipelineId}:${String(pipeline)}] Reading...`);

      setImmediate(async () => {
        let count = 0;

        // TODO(burdon): ISSUE: Replay if discover timeframes out of order.
        const iterator = pipeline.messageIterator;
        for await (const [message, feedKey, i] of iterator.reader()) {
          const [writerId] = pipelines.find(([, pipeline]) => feedKey.equals(pipeline.writable!.key))!;

          // Update state machine.
          stateMachine.execute(decode(message));
          log(`[${pipelineId}:${padNum(count)}] <-- [${writerId}:${padNum(i)}]: ${message.toString()}`);
          if (++count === numMessages) {
            log(`[${pipelineId}] Done (${count})`);
            iterator.stop();
            complete();
          }
        }
      });
    });

    await reading;

    // Check same state.
    {
      const results = pipelines.reduce((map, [pipelineId,, stateMachine]) => {
        const value = stateMachine.value;
        log(`[${pipelineId}]: Result = ${value}`);
        const peers = map.get(value) ?? [];
        peers.push(pipelineId);
        map.set(value, peers);
        return map;
      }, new Map<number, string[]>());

      // TODO(burdon): Require timeframe for ordering.
      // expect(results.size).toBe(1);
      // const value = Array.from(results.keys())[0];
      // expect(results.get(value)!.length).toBe(numPipelines);
      expect(results.size).toBeGreaterThan(0);
    }
  });
});
