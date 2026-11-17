//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import * as Registry from 'effect/reactivity/AtomRegistry';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Agent from '@dxos/assistant/Agent';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { MemoryService } from '@dxos/echo-memory';
import { MemorySqlite } from '@dxos/echo-memory-sqlite';
import { Space } from '@dxos/halo';
import { IdentityDid } from '@dxos/keys';
import { type FactStoreApi, FactStoreMemory } from '@dxos/pipeline-rdf';

import { AgentOperation, BrainService } from '#types';

import { TriggerRegistry } from '../triggers.ts';
import * as BrainMemory from './BrainMemory.ts';

/** A fresh in-memory space memory, closed with the test's scope, on the clock in context (a test's `TestClock`). */
export const freshMemory: Effect.Effect<MemoryService.Service, never, Scope.Scope> = Layer.build(
  MemorySqlite.layerMemory,
).pipe(Effect.map(Context.get(MemoryService.MemoryService)));

/** An `AgentService` for brain tests that never wake an agent, so a brain that tried fails loudly. */
export const UNUSED_AGENTS: AgentService.Service = {
  getSession: () => Effect.die('getSession is not used by these tests'),
  hydrate: () => Effect.void,
};

export type TestBrainOptions = {
  /**
   * `session` submits a woken prompt to the chat's session, so a turn runs there; `record` only keeps
   * the request, for tests of where a delivery goes rather than what the agent then says.
   * @default 'session'
   */
  wake?: 'session' | 'record';
  /** The brain's clock (epoch ms); the wall clock by default, so tests of time-driven rules can move it. */
  now?: () => number;
};

/**
 * Creates an agent whose chats run in the test's runtime: an agent's chats default to EDGE, which a test
 * has none of, and its participant chats take the primary chat's location.
 */
export const createLocalAgent = Effect.fnUntraced(function* (name: string) {
  const created = yield* Operation.invoke(AgentOperation.CreateAgent, { name });
  const chat = yield* Agent.loadChat(yield* Database.load(created.agent));
  if (chat) {
    Obj.update(chat, (chat) => {
      chat.remote = false;
    });
  }
  return created;
});

/**
 * One brain for a test file, over one in-memory space memory: the layer can be provided both to the resolver
 * (operations) and to the test body, and every build sees the same facts, subscriptions and outboxes.
 */
export const makeTestBrain = ({ wake = 'session', now }: TestBrainOptions = {}) => {
  const triggers = new TriggerRegistry();
  const wakes: BrainService.WakeRequest[] = [];
  // The memory reads time from the clock it opens with, so a test that moves `now` moves the memory's clock too.
  const clockLayer = Layer.effect(
    Clock.Clock,
    Clock.Clock.pipe(
      Effect.map((clock): Clock.Clock =>
        now === undefined
          ? clock
          : {
              ...clock,
              currentTimeMillisUnsafe: () => now(),
              currentTimeMillis: Effect.sync(() => now()),
              currentTimeNanosUnsafe: () => BigInt(now()) * 1_000_000n,
              currentTimeNanos: Effect.sync(() => BigInt(now()) * 1_000_000n),
            },
      ),
    ),
  );
  const memoryRuntime = ManagedRuntime.make(MemorySqlite.layerMemory.pipe(Layer.provide(clockLayer)));
  const memory = Effect.promise(() => memoryRuntime.runPromise(MemoryService.MemoryService));
  const clearAll = Effect.gen(function* () {
    const service = yield* MemoryService.MemoryService;
    for (const subscription of yield* service.subscriptions()) {
      yield* service.unsubscribe(subscription.id);
    }
    triggers.snapshot.forEach(({ id }) => triggers.remove(id));
  });
  const resetAll = Effect.gen(function* () {
    yield* clearAll;
    yield* (yield* MemoryService.MemoryService).reset();
    wakes.length = 0;
  });
  const layer: Layer.Layer<BrainService.BrainService, never, AgentService.AgentService> = Layer.effect(
    BrainService.BrainService,
    Effect.gen(function* () {
      const agents = yield* AgentService.AgentService;
      // Built once per layer, each with its own host's agents, over the same memory.
      const { service } = BrainMemory.make(agents, yield* memory, { triggers });
      return wake === 'session'
        ? service
        : { ...service, wake: (request: BrainService.WakeRequest) => Effect.sync(() => void wakes.push(request)) };
    }),
  );
  return {
    layer,
    triggers,
    wakes,
    /** The space memory's facts, read through a FactStore. */
    facts: (_agent: string): FactStoreApi => {
      const store = memory.pipe(Effect.map(FactStoreMemory.make));
      return {
        putFacts: (facts) => store.pipe(Effect.flatMap((through) => through.putFacts(facts))),
        predicates: () => store.pipe(Effect.flatMap((through) => through.predicates())),
        query: (query) => store.pipe(Effect.flatMap((through) => through.query(query))),
        select: (sparql) => store.pipe(Effect.flatMap((through) => through.select(sparql))),
        rows: (sparql) => store.pipe(Effect.flatMap((through) => through.rows(sparql))),
        cursor: (source) => store.pipe(Effect.flatMap((through) => through.cursor(source))),
        setCursor: (source, hash) => store.pipe(Effect.flatMap((through) => through.setCursor(source, hash))),
        exportTrig: () => store.pipe(Effect.flatMap((through) => through.exportTrig())),
        importTrig: (trig) => store.pipe(Effect.flatMap((through) => through.importTrig(trig))),
        clear: () => store.pipe(Effect.flatMap((through) => through.clear())),
      };
    },
    /** Forgets every trigger the memory and the registry hold, so a test starts with none. */
    clearTriggers: () => memoryRuntime.runPromise(clearAll),
    /**
     * Empties the memory (facts, cursors, triggers): one test's space starts as empty as a new space's memory would,
     * since the one memory here stands in for every space's.
     */
    reset: () => memoryRuntime.runPromise(resetAll),
    /** {@link clearTriggers} for a synchronous caller, such as a scripted model turn; the in-memory store never waits. */
    clearTriggersSync: () => memoryRuntime.runSync(clearAll),
  };
};

const memberDid = (seed: number): IdentityDid => IdentityDid.encode(new Uint8Array(IdentityDid.byteLength).fill(seed));

/** The space members tests speak as, by first name; facts are attributed to their DIDs. */
export const TEST_MEMBERS = {
  dima: memberDid(1),
  rich: memberDid(2),
  josiah: memberDid(3),
  alice: memberDid(4),
  bob: memberDid(5),
} as const;

const unsupported = () => Effect.die(new Error('Not available in the test space service.'));

/** HALO's `Space.Service` answering only membership, with the given members. */
export const makeTestSpaceLayer = (
  members: readonly { did: string; displayName: string }[],
): Layer.Layer<Space.Service> =>
  Layer.succeed(Space.Service, {
    members: () =>
      Stream.make(
        members.map(({ did, displayName }): Space.Member => ({
          did: IdentityDid.make(did),
          displayName,
          role: 'edit',
          online: true,
        })),
      ),
    get: (id) => Effect.succeed(Option.some({ id, state: 'ready' as const })),
    spaces: Stream.empty,
    create: unsupported,
    waitReady: () => Effect.void,
    setEdgeReplication: unsupported,
    updateMemberRole: unsupported,
    removeMember: unsupported,
    share: unsupported,
    join: unsupported,
    invitations: () => Stream.empty,
    export: unsupported,
    import: unsupported,
  });

/** {@link makeTestSpaceLayer} over {@link TEST_MEMBERS}. */
export const testSpaceLayer = makeTestSpaceLayer([
  { did: TEST_MEMBERS.dima, displayName: 'Dima' },
  { did: TEST_MEMBERS.rich, displayName: 'Rich Burdon' },
  { did: TEST_MEMBERS.josiah, displayName: 'Josiah' },
  { did: TEST_MEMBERS.alice, displayName: 'Alice' },
  { did: TEST_MEMBERS.bob, displayName: 'Bob' },
]);

/**
 * A capability registry with no channel backends: relays look a channel's backend up there, so a suite whose agents
 * have no channels still needs one to deliver into Composer chats.
 */
export const noChannelBackends = Layer.sync(Capability.Service, () =>
  CapabilityManager.make({ registry: Registry.make() }),
);
