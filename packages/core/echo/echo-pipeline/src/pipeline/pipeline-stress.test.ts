//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import * as fc from 'fast-check';
import { inspect } from 'util';

import { asyncTimeout } from '@dxos/async';
import { type FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedMessageBlock } from '@dxos/protocols';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { describe, test } from 'vitest'
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { Pipeline } from './pipeline';
import { TestFeedBuilder } from '../testing';

const NUM_AGENTS = 2;
const NUM_MESSAGES = 10;

// TODO(burdon): Describe test.
describe('pipeline/stress test', () => {
  test
    .skip('stress', async () => {
      const builder = new TestFeedBuilder();

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

        const agents = new Map(agentIds.map((id) => [id, new Agent(builder, feedStore, id)]));
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

      await fc.assert(model, { examples });
    })
    .timeout(60_000);
});

class Agent {
  public startingTimeframe = new Timeframe();
  public pipeline!: Pipeline;
  public feed!: FeedWrapper<FeedMessage>;
  public messages: FeedMessageBlock[] = [];
  public writePromise: Promise<any> = Promise.resolve();

  constructor(
    private readonly builder: TestFeedBuilder,
    public feedStore: FeedStore<FeedMessage>,
    public id: string,
  ) {}

  async open() {
    const key = await this.builder.keyring.createKey();
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
  constructor(
    public agent: string,
    public count: number,
  ) {}

  check = () => true;

  async run(model: Model, real: Real) {
    // console.log(`WriteCommand(${this.agent}, ${this.count})`);
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
    // console.log('SyncCommand()');
    const targets: any = {};

    try {
      for (const agent of real.agents.values()) {
        await agent.writePromise;
      }

      for (const agent of real.agents.values()) {
        targets[agent.id] = agent.pipeline.state.endTimeframe;
        if (agent.pipeline.state.endTimeframe.isEmpty()) {
          log('empty endtimeframe', {
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
      log(
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
    log(`RestartCommand(${this.agent})`);

    const agent = real.agents.get(this.agent)!;
    await agent.writePromise;
    await agent.stop();
    await agent.start();
  }

  toString = () => `RestartCommand(${this.agent})`;
}
