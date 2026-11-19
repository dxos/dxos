//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Fact, MemoryQuery, MemoryService, Subscription } from '@dxos/echo-memory';

import * as MemorySqlite from './MemorySqlite.ts';

const START = Date.parse('2027-01-04T09:00:00.000Z');

const said = (id: string, speaker: string, object: string, at = START): Fact.Fact =>
  Fact.decode([
    {
      id,
      assertion: {
        subject: { kind: 'entity', entity: speaker },
        predicate: 'works on',
        object: { kind: 'entity', entity: object },
        quote: `${speaker} works on ${object}`,
      },
      factuality: { value: 'CT+', polarity: '+' },
      attribution: { agent: speaker, source: `chat:general/${id}`, generatedAtTime: new Date(at).toISOString() },
      recordedAt: new Date(at).toISOString(),
      extractor: { id: 'test', model: 'none', version: '1' },
      sourceHash: id,
    },
  ])[0];

const subscription = (id: string, rules: string, owner?: string): Subscription.Subscription => ({
  id: Subscription.SubscriptionId.make(id),
  owner: owner === undefined ? undefined : Fact.EntityKey.make(owner),
  rules,
  createdAt: new Date(START).toISOString(),
  payload: { note: id },
});

const WATCH_DIMA = 'wake(dima) :- speaker(F, dima).';

/** Starts every test at {@link START}, so rules and events see a fixed clock. */
const atStart = TestClock.setTime(START);

const memory = MemoryService.MemoryService;

describe('MemorySqlite', () => {
  it.effect('facts round-trip within one memory and stay out of another (T-1)', () =>
    Effect.gen(function* () {
      yield* atStart;
      const first = yield* Layer.build(MemorySqlite.layerMemory).pipe(Effect.map(Context.get(memory)));
      const second = yield* Layer.build(MemorySqlite.layerMemory).pipe(Effect.map(Context.get(memory)));
      yield* first.put([said('f1', 'dima', 'indexer'), said('f2', 'rich', 'ui'), said('f3', 'kai', 'indexer')]);

      const found = yield* first.query(MemoryQuery.facts({ entity: Fact.EntityKey.make('indexer') }));
      expect(found.map(({ assertion }) => assertion.subject)).toEqual([
        expect.objectContaining({ entity: 'dima' }),
        expect.objectContaining({ entity: 'kai' }),
      ]);
      expect(yield* second.query(MemoryQuery.facts({ entity: Fact.EntityKey.make('indexer') }))).toEqual([]);
    }).pipe(Effect.scoped),
  );

  it.effect('a subscription wakes, is drained, and does not queue the same wake twice (T-2)', () =>
    Effect.gen(function* () {
      yield* atStart;
      const service = yield* memory;
      expect(yield* service.subscribe(subscription('watch', WATCH_DIMA, 'agent'))).toBe(true);

      const fact = said('f1', 'dima', 'indexer');
      expect(yield* service.put([fact])).toBe(1);
      const events = yield* service.take(Subscription.SubscriptionId.make('watch'));
      expect(events).toHaveLength(1);
      expect(events[0].facts).toEqual([expect.objectContaining({ id: 'f1' })]);

      yield* service.ack(
        Subscription.SubscriptionId.make('watch'),
        events.map(({ id }) => id),
      );
      expect(yield* service.take(Subscription.SubscriptionId.make('watch'))).toEqual([]);
      expect(yield* service.put([fact])).toBe(0);
    }).pipe(Effect.provide(MemorySqlite.layerMemory)),
  );

  it.effect('quiet speakers are stored but wake nothing (T-3)', () =>
    Effect.gen(function* () {
      yield* atStart;
      const service = yield* memory;
      yield* service.subscribe(subscription('watch', WATCH_DIMA));
      expect(yield* service.put([said('f1', 'dima', 'indexer')], { quiet: [Fact.EntityKey.make('dima')] })).toBe(0);
      expect(yield* service.query(MemoryQuery.facts())).toHaveLength(1);
    }).pipe(Effect.provide(MemorySqlite.layerMemory)),
  );

  it.effect('a file-backed memory keeps its event base across a reopen (T-4)', () =>
    Effect.gen(function* () {
      yield* atStart;
      const dir = mkdtempSync(join(tmpdir(), 'echo-memory-'));
      const path = join(dir, 'memory.db');
      yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));

      yield* Effect.gen(function* () {
        const service = yield* memory;
        yield* service.subscribe(subscription('watch', WATCH_DIMA, 'agent'));
        yield* service.put([said('f1', 'dima', 'indexer')], {
          read: { source: Fact.SourceUri.make('chat:general'), through: 'f1' },
        });
      }).pipe(Effect.provide(MemorySqlite.layerFile(path)));

      yield* Effect.gen(function* () {
        const service = yield* memory;
        expect((yield* service.subscriptions()).map(({ id }) => id)).toEqual(['watch']);
        expect(yield* service.take(Subscription.SubscriptionId.make('watch'))).toHaveLength(1);
        expect(yield* service.query(MemoryQuery.cursor(Fact.SourceUri.make('chat:general')))).toBe('f1');
      }).pipe(Effect.provide(MemorySqlite.layerFile(path)));
    }).pipe(Effect.scoped),
  );

  it.effect('reset forgets facts, cursors and events but keeps subscriptions (T-5)', () =>
    Effect.gen(function* () {
      yield* atStart;
      const service = yield* memory;
      const seed = yield* service.query(MemoryQuery.predicates());
      yield* service.subscribe(subscription('watch', WATCH_DIMA));
      yield* service.put([said('f1', 'dima', 'indexer')], {
        read: { source: Fact.SourceUri.make('chat:general'), through: 'f1' },
      });
      yield* service.put(
        [said('f2', 'dima', 'mints', START)].map((fact) => ({
          ...fact,
          assertion: { ...fact.assertion, predicate: 'mints a new predicate' },
        })),
      );

      yield* service.reset();
      expect(yield* service.query(MemoryQuery.facts())).toEqual([]);
      expect(yield* service.query(MemoryQuery.cursor(Fact.SourceUri.make('chat:general')))).toBeUndefined();
      expect(yield* service.query(MemoryQuery.predicates())).toEqual(seed);
      expect((yield* service.subscriptions()).map(({ id }) => id)).toEqual(['watch']);
      expect(yield* service.take(Subscription.SubscriptionId.make('watch'))).toEqual([]);

      // The kept subscription still wakes.
      expect(yield* service.put([said('f3', 'dima', 'indexer')])).toBe(1);
    }).pipe(Effect.provide(MemorySqlite.layerMemory)),
  );

  it.effect('subscriptions filter by owner, unsubscribe once, and refuse rules that do not compile', () =>
    Effect.gen(function* () {
      yield* atStart;
      const service = yield* memory;
      yield* service.subscribe(subscription('a', WATCH_DIMA, 'alice'));
      yield* service.subscribe(subscription('b', WATCH_DIMA, 'bob'));
      expect((yield* service.subscriptions(Fact.EntityKey.make('bob'))).map(({ id }) => id)).toEqual(['b']);
      expect((yield* service.subscriptions())[0].payload).toEqual({ note: 'a' });

      expect(yield* service.unsubscribe(Subscription.SubscriptionId.make('a'))).toBe(true);
      expect(yield* service.unsubscribe(Subscription.SubscriptionId.make('a'))).toBe(false);

      const error = yield* Effect.flip(service.subscribe(subscription('bad', 'wake(x) :- not valid (')));
      expect(error.name).toBe('MemoryError');
    }).pipe(Effect.provide(MemorySqlite.layerMemory)),
  );

  it.effect('time-driven rules wake by themselves as the clock passes', () =>
    Effect.gen(function* () {
      yield* atStart;
      const service = yield* memory;
      yield* service.subscribe(subscription('daily', 'wake(practice) :- every(1d).'));
      expect(yield* service.take(Subscription.SubscriptionId.make('daily'))).toEqual([]);

      yield* TestClock.adjust('25 hours');
      const events = yield* service.take(Subscription.SubscriptionId.make('daily'));
      expect(events.map(({ label }) => label)).toEqual(['practice']);
      expect(events[0].facts).toEqual([]);
    }).pipe(Effect.provide(MemorySqlite.layerMemory)),
  );

  it.effect('a query answer for SPARQL rows is typed and decoded', () =>
    Effect.gen(function* () {
      yield* atStart;
      const service = yield* memory;
      yield* service.put([said('f1', 'dima', 'indexer')]);
      const rows = yield* service.query(MemoryQuery.sparql('SELECT ?g WHERE { GRAPH ?g { ?s ?p ?o } }'));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].g?.termType).toBe('NamedNode');
      const graphs = yield* service.query(MemoryQuery.graphs('SELECT ?g WHERE { GRAPH ?g { ?s ?p ?o } }'));
      expect(graphs.map(({ id }) => id)).toContain('f1');
    }).pipe(Effect.provide(MemorySqlite.layerMemory)),
  );
});
