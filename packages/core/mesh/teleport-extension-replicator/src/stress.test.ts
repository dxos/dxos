//
// Copyright 2022 DXOS.org
//

import * as fc from 'fast-check';
import { describe, onTestFinished, test } from 'vitest';

import { Event, asyncTimeout } from '@dxos/async';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { type Teleport } from '@dxos/teleport';
import { ComplexMap, ComplexSet, range } from '@dxos/util';

import { ReplicatorExtension } from './replicator-extension';
import { createStreamPair } from './testing';

const MAX_NUM_FEEDS = 3;

class TestAgent {
  public storage = createStorage({ type: StorageType.RAM });
  readonly feedStore = new FeedStore({
    factory: new FeedFactory({ root: this.storage.createDirectory('feeds'), signer: this.keyring }),
  });

  readonly replicator = new ReplicatorExtension().setOptions({ upload: true });

  // prettier-ignore
  constructor(
    readonly keyring: Keyring,
    readonly peer: Teleport,
  ) {
    peer.addExtension('dxos.mesh.teleport.replicator', this.replicator);
  }

  async destroy(): Promise<void> {
    await this.peer.close();
    await this.feedStore.close();
  }
}

/**
 * The simplified model of the system.
 */
interface Model {
  feedOwner: ComplexMap<PublicKey, AgentName>;
  feeds: ComplexMap<PublicKey, number>;
  agent1: ComplexSet<PublicKey>;
  agent2: ComplexSet<PublicKey>;
}

/**
 * The real system being tested.
 */
interface Real {
  agent1: TestAgent;
  agent2: TestAgent;
}

type AgentName = 'agent1' | 'agent2';
const arbAgentName = fc.constantFrom<AgentName[]>('agent1', 'agent2');

const assertState = async (model: Model, real: Real) => {
  for (const agent of ['agent1', 'agent2'] as AgentName[]) {
    for (const feedKey of model[agent].keys()) {
      const expectedLength = model.feeds.get(feedKey)!;
      const feed = await real[agent].feedStore.openFeed(feedKey, { writable: true });

      log('check', { agent, feedKey: feedKey.truncate(), expectedLength, actualLength: feed.length });
      if (feed.length !== expectedLength) {
        log('waiting for feed', {
          agent,
          feedKey,
          expectedLength,
          feedLength: feed.length,
        });
        await asyncTimeout(
          Event.wrap(feed, 'download').waitForCondition(() => feed.length === expectedLength),
          100,
        );
      }
    }
  }
};

class OpenFeedCommand implements fc.AsyncCommand<Model, Real> {
  // prettier-ignore
  constructor(
    readonly agent: AgentName,
    readonly feedKey: PublicKey,
  ) {}

  toString = () => `OpenFeedCommand(${this.agent}, ${this.feedKey.truncate()})`;

  check = (model: Readonly<Model>) => model[this.agent].has(this.feedKey) === false;

  // TODO(dmaretskyi): model, real.
  run = async (model: Model, real: Real) => {
    if (!model.feeds.has(this.feedKey)) {
      model.feeds.set(this.feedKey, 0);
      model.feedOwner.set(this.feedKey, this.agent);
    }

    model[this.agent].add(this.feedKey);

    const feed = await real[this.agent].feedStore.openFeed(this.feedKey, { writable: true });
    real[this.agent].replicator.addFeed(feed);

    await assertState(model, real);
  };
}

class WriteToFeedCommand implements fc.AsyncCommand<Model, Real> {
  // prettier-ignore
  constructor(
    readonly agent: AgentName,
    readonly feedKey: PublicKey,
    readonly count: number,
  ) {}

  toString = () => `WriteToFeedCommand(${this.agent}, ${this.feedKey.truncate()}, ${this.count})`;

  check = (model: Readonly<Model>) =>
    model[this.agent].has(this.feedKey) === true && model.feedOwner.get(this.feedKey) === this.agent;

  run = async (model: Model, real: Real) => {
    model.feeds.set(this.feedKey, model.feeds.get(this.feedKey)! + this.count);

    const feed = await real[this.agent].feedStore.openFeed(this.feedKey, { writable: true });
    for (const _ of range(this.count)) {
      await feed.append('testing');
    }

    await assertState(model, real);
  };
}

const factory =
  (keyring: Keyring): fc.ModelRunAsyncSetup<Model, Real> =>
  async () => {
    log('creating agents');
    const { peer1, peer2 } = await createStreamPair();
    return {
      model: {
        feedOwner: new ComplexMap(PublicKey.hash),
        feeds: new ComplexMap(PublicKey.hash),
        agent1: new ComplexSet(PublicKey.hash),
        agent2: new ComplexSet(PublicKey.hash),
      },
      real: {
        agent1: new TestAgent(keyring, peer1),
        agent2: new TestAgent(keyring, peer2),
      },
    };
  };

describe('stress-tests', () => {
  test('example', async () => {
    const keyring = new Keyring();
    const feedKey = await keyring.createKey();

    const system = await factory(keyring)();
    onTestFinished(async () => {
      await system.real.agent1.destroy();
      await system.real.agent2.destroy();
    });

    await fc.asyncModelRun(
      () => system,
      [
        new OpenFeedCommand('agent1', feedKey),
        new OpenFeedCommand('agent2', feedKey),
        new WriteToFeedCommand('agent1', feedKey, 10),
      ],
    );
  });

  test('example with two feeds', async () => {
    const keyring = new Keyring();
    const feedKey1 = await keyring.createKey();
    const feedKey2 = await keyring.createKey();

    const system = await factory(keyring)();
    onTestFinished(async () => {
      await system.real.agent1.destroy();
      await system.real.agent2.destroy();
    });

    await fc.asyncModelRun(
      () => system,
      [
        new OpenFeedCommand('agent1', feedKey1),
        new OpenFeedCommand('agent2', feedKey1),
        new WriteToFeedCommand('agent1', feedKey1, 10),
        new OpenFeedCommand('agent1', feedKey2),
        new OpenFeedCommand('agent2', feedKey2),
        new WriteToFeedCommand('agent1', feedKey2, 10),
      ],
    );
  });

  /**
   * Simulates two peers in a single session, replicating multiple feeds between each other.
   * Feeds are randomly created and appended.
   */
  test.skip('generic (disable if flaky)', { timeout: 100_000 }, async () => {
    const keyring = new Keyring();

    const keys = await Promise.all(range(MAX_NUM_FEEDS).map(() => keyring.createKey()));
    const arbFeedKey = fc.constantFrom(...keys);

    const allCommands = [
      fc.tuple(arbAgentName, arbFeedKey).map(([agent, feedKey]) => new OpenFeedCommand(agent, feedKey)),

      fc
        .tuple(arbAgentName, arbFeedKey, fc.integer({ min: 1, max: 10 }))
        .map(([agent, feedKey, count]) => new WriteToFeedCommand(agent, feedKey, count)),
    ];

    await fc.assert(
      fc.asyncProperty(fc.commands(allCommands, { maxCommands: 100 }), async (cmds) => {
        // console.log('\n=====');
        // console.log([...cmds].map((c) => c.toString()).join('\n'));

        const system = await factory(keyring)();
        try {
          await fc.asyncModelRun(() => system, cmds);
        } finally {
          // TODO(dmaretskyi): Destroy breaks the test.
          await system.real.agent1.destroy();
          await system.real.agent2.destroy();
        }
      }),
    );
  });
});
