//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { latch, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { Feed, FeedStore, MessageIterator, Pipeline } from './pipeline';
import { HALO } from './space';

const log = debug('dxos:test:pipeline');

const padNum = (n: number, len = 4) => String(n).padStart(len, '0');

describe.only('Stack', () => {
  test.skip('Pipeline message ordering', async () => {
    const fs = new FeedStore();

    // TODO(burdon): Order by timeframe.
    const it = new MessageIterator(fs);

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
    for await (const [message] of it.reader()) {
      log(`Message[${padNum(count)}] = ${message.length}`);
      if (++count === numMessages) {
        it.stop();
      }
    }

    // TODO(burdon): Check in order.
    expect(true).toBeTruthy();
  });

  type PipelineDef = [id: string, pipeline: Pipeline]

  // NOTE: No dependencies on Space.
  test.only('Pipeline', async () => {
    // Create peers.
    const numPipelines = 2;
    const pipelines: PipelineDef[] = Array.from({ length: numPipelines }).map((_, i) => {
      return [`P-${i + 1}`, new Pipeline({ writable: true })];
    });

    // TODO(burdon): Simulate replication.
    pipelines.forEach(([pipelineId, pipeline]) => {
      pipelines.forEach(([peerId, peer]) => {
        if (pipelineId !== peerId) {
          pipeline.feedStore.addFeed(peer.writableFeed!);
        }
      });
    });

    // Write a message.
    const numMessages = 10;
    setImmediate(async () => {
      for (let i = 0; i < numMessages; i++) {
        const [pipelineId, pipeline] = faker.random.arrayElement(pipelines);
        const message = {
          timeframe: pipeline.messageIterator.getTimeframe(),
          data: faker.datatype.hexaDecimal()
        };

        log(`[${pipelineId}:${padNum(pipeline.writableFeed?.length ?? 0)}] ==> ${JSON.stringify(message)}`);
        pipeline.writableFeed!.append(Buffer.from(JSON.stringify(message)));
        await sleep(faker.datatype.number({ min: 10, max: 100 }));
      }
    });

    // Consume messages.
    // TODO(burdon): ISSUE: What if discover out of order? Replay?
    const [reading, done] = latch({ count: pipelines.length });
    pipelines.forEach(([pipelineId, pipeline]) => {
      log(`[${pipelineId}:${String(pipeline)}] Reading...`);

      setImmediate(async () => {
        let count = 0;
        const iterator = pipeline.messageIterator;
        for await (const [message, feedKey, i] of iterator.reader()) {
          const [writerId] = pipelines.find(([, pipeline]) => feedKey.equals(pipeline.writableFeed!.key))!;
          log(`[${pipelineId}:${padNum(count)}] <-- [${writerId}:${padNum(i)}]: ${message.toString()}`);
          if (++count === numMessages) {
            log(`[${pipelineId}] Done`);
            iterator.stop();
            done();
          }
        }
      });
    });

    await reading;
  });

  // TODO(burdon): Move to halo.test.ts

  // Phase 1: Pipeline Abstraction
  // TODO(burdon): Pipeline abstraction with multiple "peers" (and single writable feed).
  // TODO(burdon): Replication.
  // TODO(burdon): Auth state machine.
  test.skip('Genesis', async () => {
    const halo = new HALO();
    await halo.genesis();

    // TODO(burdon): Wait for first device to show up.
    expect(halo.initialized).toBeTruthy();

    // TODO(burdon): Write credential to invite new device.
    const device = {
      key: PublicKey.random()
    };
    await halo.addDevice(device.key);
  });

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
