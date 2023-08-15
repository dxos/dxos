//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import * as fc from 'fast-check';
import { inspect } from 'util';

import { asyncTimeout } from '@dxos/async';
import { FeedStore, FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedMessageBlock } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { describe, test, afterTest } from '@dxos/test';
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

  test('reading and writing with cursor changes', async () => {
    const pipeline = new Pipeline();
    afterTest(() => pipeline.stop());

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

    // skip first 10, process the rest, and the repeat the last 10.
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

  test
    .skip('stress', async () => {
      const builder = new TestFeedBuilder();

      const NUM_AGENTS = 2;
      const NUM_MESSAGES = 100;

      class Agent {
        public startingTimeframe = new Timeframe();
        public pipeline!: Pipeline;
        public feed!: FeedWrapper<FeedMessage>;
        public messages: FeedMessageBlock[] = [];
        public writePromise: Promise<any> = Promise.resolve();

        constructor(public id: string, public feedStore: FeedStore<FeedMessage>) {}

        async open() {
          const key = await builder.keyring.createKey();
          this.feed = await this.feedStore.openFeed(key, { writable: true });
        }

        async start() {
          this.pipeline = new Pipeline();
          await this.pipeline.setCursor(this.startingTimeframe);

          await this.pipeline.start();

          // NOTE: not awaiting here breaks the test.
          await Promise.all(this.feedStore.feeds.map((feed) => this.pipeline.addFeed(feed)));
          this.pipeline.setWriteFeed(this.feed);

          // consume in async task.
          void this.consume();
        }

        async stop() {
          await this.pipeline.stop();
          this.startingTimeframe = this.pipeline.state.timeframe;
        }

        async close() {
          await this.feed.close();
        }

        write(message: FeedMessage.Payload) {
          const prev = this.writePromise;
          const promise = this.pipeline.writer!.write(message);
          this.writePromise = Promise.all([prev, promise]);
        }

        async consume() {
          for await (const msg of this.pipeline.consume()) {
            this.messages.push(msg);
          }
          log('stopped consuming');
        }
      }

      type Model = {};
      type Real = {
        feedStore: FeedStore<FeedMessage>;
        agents: Map<string, Agent>;
      };

      class WriteCommand implements fc.AsyncCommand<Model, Real> {
        constructor(public agent: string, public count: number) {}

        check = () => true;

        async run(model: Model, real: Real) {
          console.log(`WriteCommand(${this.agent}, ${this.count})`);

          const agent = real.agents.get(this.agent)!;

          const toWrite = Math.min(this.count, NUM_MESSAGES - agent.feed.length);
          if (toWrite > 0) {
            for (const _ of range(toWrite)) {
              agent.write({}); // Content is not important.
            }
          }
        }

        toString = () => `WriteCommand(${this.agent}, ${this.count})`;
      }

      class SyncCommand implements fc.AsyncCommand<Model, Real> {
        check = () => true;

        async run(model: Model, real: Real) {
          console.log('SyncCommand()');
          const targets: any = {};

          try {
            for (const agent of real.agents.values()) {
              await agent.writePromise;
            }

            for (const agent of real.agents.values()) {
              targets[agent.id] = agent.pipeline.state.endTimeframe;
              if (agent.pipeline.state.endTimeframe.isEmpty()) {
                console.log('empty endtimeframe', {
                  id: agent.id,
                  endTimeframe: agent.pipeline.state.endTimeframe,
                  feeds: agent.pipeline.getFeeds().map((feed) => [feed.key.toString(), feed.length]),
                });
              }
              await asyncTimeout(agent.pipeline.state.waitUntilTimeframe(agent.pipeline.state.endTimeframe), 1000);
            }

            const tf: Timeframe = real.agents.values().next().value!.pipeline.state.timeframe;
            for (const agent of real.agents.values()) {
              expect(agent.pipeline.state.timeframe.equals(tf)).toEqual(true);
            }

            const totalMessages = real.feedStore.feeds.reduce((acc, feed) => acc + feed.length, 0);
            for (const agent of real.agents.values()) {
              expect(agent.messages.length).toEqual(totalMessages);
            }
          } catch (err) {
            console.log(
              inspect(
                {
                  agents: Array.from(real.agents.values()).map((agent) => ({
                    id: agent.id,
                    messages: agent.messages.length,
                    feeds: agent.pipeline.getFeeds().map((feed) => [feed.key, feed.length]),
                    timeframe: agent.pipeline.state.timeframe,
                    endTimeframe: agent.pipeline.state.endTimeframe,
                  })),
                  feeds: real.feedStore.feeds.map((feed) => [feed.key, feed.length]),
                  targets,
                },
                false,
                null,
                true,
              ),
            );
            throw err;
          }
        }

        toString = () => 'SyncCommand()';
      }

      class RestartCommand implements fc.AsyncCommand<Model, Real> {
        constructor(public agent: string) {}

        check = () => true;

        async run(model: Model, real: Real) {
          console.log(`RestartCommand(${this.agent})`);

          const agent = real.agents.get(this.agent)!;

          await agent.writePromise;
          await agent.stop();
          await agent.start();
        }

        toString = () => `RestartCommand(${this.agent})`;
      }

      const agentIds = range(NUM_AGENTS).map(() => PublicKey.random().toHex().slice(0, 8));
      const anAgentId = fc.constantFrom(...agentIds);

      const commands = fc.commands(
        [
          fc.tuple(anAgentId, fc.integer({ min: 1, max: 10 })).map(([agent, count]) => new WriteCommand(agent, count)),
          fc.constant(new SyncCommand()),
          anAgentId.map((agent) => new RestartCommand(agent)),
        ],
        { size: 'large' },
      );

      const model = fc.asyncProperty(commands, async (commands) => {
        const feedStore = builder.createFeedStore();

        const agents = new Map(agentIds.map((id) => [id, new Agent(id, feedStore)]));
        await Promise.all(Array.from(agents.values()).map((agent) => agent.open()));
        await Promise.all(Array.from(agents.values()).map((agent) => agent.start()));

        const setup: fc.ModelRunSetup<Model, Real> = () => ({
          model: {},
          real: {
            feedStore,
            agents,
          },
        });

        try {
          await fc.asyncModelRun(setup, [...commands, new SyncCommand()]);
        } finally {
          await Promise.all(Array.from(agents.values()).map((agent) => agent.stop()));
          await Promise.all(Array.from(agents.values()).map((agent) => agent.close()));
        }
      });

      const examples: [commands: Iterable<fc.AsyncCommand<Model, Real, boolean>>][] = [
        [[new WriteCommand(agentIds[0], 10), new WriteCommand(agentIds[1], 10), new SyncCommand()]],
        [[new WriteCommand(agentIds[0], 4), new RestartCommand(agentIds[0]), new SyncCommand()]],
      ];

      await fc.invariant(model, { examples });
    })
    .timeout(60_000);
});
