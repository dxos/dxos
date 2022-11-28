import { PublicKey } from "@dxos/keys";
import { ComplexMap, ComplexSet, range } from "@dxos/util";
import * as fc from 'fast-check'
import { FeedFactory, FeedStore } from "@dxos/feed-store";
import { Keyring } from "@dxos/keyring";
import { createStorage, StorageType } from "@dxos/random-access-storage";
import { ReplicatorExtension } from "./replicator-extension";
import { asyncTimeout, Event } from '@dxos/async'
import { log } from "@dxos/log";
import { createReplicatorPair, createStreamPair } from "./testing";
import { Teleport } from "@dxos/teleport";
import { afterTest } from "@dxos/testutils";

const MAX_NUM_FEEDS = 10;

class TestAgent {
  public storage = createStorage({ type: StorageType.RAM });
  readonly feedStore = new FeedStore({
    factory: new FeedFactory({ root: this.storage.createDirectory('feeds'), signer: this.keyring })
  });

  readonly replicator = new ReplicatorExtension().setOptions({ upload: true });
  
  constructor(
    readonly keyring: Keyring,
    readonly peer: Teleport
  ) {
    peer.addExtension('dxos.mesh.teleport.replicator', this.replicator);
  }

  async destroy() {
    await this.peer.close();
    await this.feedStore.close();
  }
}

/**
 * The simplified model of the system.
 */
interface Model {
  agent1: ComplexMap<PublicKey, number>;
  agent2: ComplexMap<PublicKey, number>;
}

/**
 * The real system being tested.
 */
interface Real {
  agent1: TestAgent,
  agent2: TestAgent,
}

type AgentName = 'agent1' | 'agent2'
const arbAgentName = fc.constantFrom<AgentName[]>('agent1', 'agent2')

class OpenFeedCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly agent: AgentName, readonly feedKey: PublicKey) { }

  toString = () => `OpenFeedCommand(${this.agent}, ${this.feedKey})`

  check = (m: Readonly<Model>) => m[this.agent].has(this.feedKey) === false

  run = async (m: Model, r: Real) => {
    m[this.agent].set(this.feedKey, 0)

    const feed = await r[this.agent].feedStore.openFeed(this.feedKey, { writable: true })
    r[this.agent].replicator.addFeed(feed)
  }
}

class WriteToFeedCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly agent: AgentName, readonly feedKey: PublicKey, readonly count: number) { }

  toString = () => `WriteToFeedCommand(${this.agent}, ${this.feedKey}, ${this.count})`

  check = (m: Readonly<Model>) => m[this.agent].has(this.feedKey) === true

  run = async (m: Model, r: Real) => {
    m[this.agent].set(this.feedKey, m[this.agent].get(this.feedKey)! + this.count)

    const otherAgent = this.agent === 'agent1' ? 'agent2' : 'agent1';
    if (m[otherAgent].has(this.feedKey)) {
      m[otherAgent].set(this.feedKey, m[this.agent].get(this.feedKey)!)
    }

    const feed = await r[this.agent].feedStore.openFeed(this.feedKey, { writable: true })
    for (const _ of range(this.count)) {
      await feed.append('testing')
    }
  }
}

class CheckCommand implements fc.AsyncCommand<Model, Real> {
  check = () => true;
  run = async (m: Model, r: Real) => {
    for (const agent of ['agent1', 'agent2'] as AgentName[]) {
      for (const feedKey of m[agent].keys()) {
        const expectedLength = m[agent].get(feedKey)!
        const feed = await r[agent].feedStore.openFeed(feedKey, { writable: true })

        if (feed.length !== expectedLength) {
          log('waiting for feed', {
            agent,
            feedKey,
            expectedLength,
            feedLength: feed.length
          })
          await asyncTimeout(Event.wrap(feed, 'download').waitForCondition(() => feed.length === expectedLength), 100);
        }
      }
    }
  };
  toString = () => `CheckCommand`;
}

const factory = (keyring: Keyring): fc.ModelRunAsyncSetup<Model, Real> => async () => {
  const { peer1, peer2 } = await createStreamPair();
  return {
    model: {
      agent1: new ComplexMap(PublicKey.hash),
      agent2: new ComplexMap(PublicKey.hash),
    },
    real: {
      agent1: new TestAgent(keyring, peer1),
      agent2: new TestAgent(keyring, peer2),
    }
  }
};

describe('stress-tests', () => {

  it('example', async () => {
    const keyring = new Keyring();
    const feedKey = await keyring.createKey();

    const system = await factory(keyring)();
    afterTest(async () => {
      await system.real.agent1.destroy();
      await system.real.agent2.destroy();
    })

    await fc.asyncModelRun(() => system, [
      new OpenFeedCommand('agent1', feedKey),
      new OpenFeedCommand('agent2', feedKey),
      new WriteToFeedCommand('agent1', feedKey, 10),
      new CheckCommand()
    ])
  })

  it.skip('generic', async () => {
    const keyring = new Keyring();

    const keys = await Promise.all(range(MAX_NUM_FEEDS).map(() => keyring.createKey()));
    const arbFeedKey = fc.constantFrom(...keys);

    const allCommands = [
      fc.tuple(arbAgentName, arbFeedKey).map(([agent, feedKey]) => new OpenFeedCommand(agent, feedKey)),
      fc.tuple(arbAgentName, arbFeedKey, fc.integer(1, 10)).map(([agent, feedKey, count]) => new WriteToFeedCommand(agent, feedKey, count)),
      fc.constant(new CheckCommand()),
    ];

    await fc.assert(fc.asyncProperty(
      fc.commands(allCommands, { maxCommands: 100 }),
      async (cmds) => {
        const system = await factory(keyring)();
        try {
          await fc.asyncModelRun(() => system, cmds);
        } finally {
          // await system.real.agent1.destroy();
          // await system.real.agent2.destroy();
        }
      }
    ));
  })

})
