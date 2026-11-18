//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';

import { Fact, MemoryQuery, MemoryService, RdfStore, Subscription } from '@dxos/echo-memory';
import { QuadStore } from '@dxos/sparql-sqlite/async';

import * as LocalRdfStore from './LocalRdfStore.ts';
import * as RdfMemory from './RdfMemory.ts';

const START = Date.parse('2027-01-04T09:00:00.000Z');

const said = (id: string, speaker: string, object: string): Fact.Fact =>
  Fact.make({
    id,
    assertion: {
      subject: { kind: 'entity', entity: speaker },
      predicate: 'works on',
      object: { kind: 'entity', entity: object },
    },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { agent: speaker, source: `chat:general/${id}`, generatedAtTime: new Date(START).toISOString() },
    recordedAt: new Date(START).toISOString(),
    extractor: { id: 'test', model: 'none', version: '1' },
    sourceHash: id,
  });

const CHAT = Fact.SourceUri.make('chat:general');
const WATCH = Subscription.SubscriptionId.make('watch');

/** A replica: a memory over its own private database and the shared log, so each replica's store starts empty. */
const openReplica = (log?: QuadStore.QuadLog) =>
  Layer.build(
    RdfMemory.layer.pipe(
      Layer.provideMerge(LocalRdfStore.layer({ log })),
      Layer.provide(SqliteClient.layer({ filename: ':memory:' })),
    ),
  ).pipe(Effect.map((context) => ({ memory: Context.get(context, MemoryService.MemoryService), context })));

const ids = (facts: readonly Fact.Fact[]) => facts.map(({ id }) => id).sort();

/** Lets the replicas' follower fibers run. */
const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 50 }));

describe('RdfMemory', () => {
  it.effect('an empty store rebuilds the memory from the log, cursors and resets included', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const log = QuadStore.memoryLog();
      const { memory: first } = yield* openReplica(log);
      yield* first.put([said('f1', 'dima', 'indexer')]);
      yield* first.reset();
      yield* first.put([said('f2', 'rich', 'ui'), said('f3', 'kai', 'ui')], { read: { source: CHAT, through: 'f3' } });

      const { memory: rebuilt } = yield* openReplica(log);
      expect(yield* rebuilt.query(MemoryQuery.facts())).toHaveLength(2);
      expect(yield* rebuilt.query(MemoryQuery.cursor(CHAT))).toBe('f3');
      expect(ids(yield* rebuilt.query(MemoryQuery.facts()))).toEqual(ids(yield* first.query(MemoryQuery.facts())));
    }).pipe(Effect.scoped),
  );

  it.effect('a replica follows what another writes and wakes its own subscriptions', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const log = QuadStore.memoryLog();
      const { memory: writer } = yield* openReplica(log);
      const { memory: reader } = yield* openReplica(log);
      yield* reader.subscribe({
        id: WATCH,
        rules: 'wake(dima) :- speaker(F, dima).',
        createdAt: new Date(START).toISOString(),
      });

      yield* writer.put([said('f1', 'dima', 'indexer')]);
      yield* settle;
      expect(yield* reader.query(MemoryQuery.facts())).toHaveLength(1);
      expect(yield* reader.take(WATCH)).toHaveLength(1);
      // Subscriptions and outboxes are the device's own: the writer has none.
      expect(yield* writer.subscriptions()).toEqual([]);
    }).pipe(Effect.scoped),
  );

  it.effect('a cursor moves with its facts, replacing the one before', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const { memory } = yield* openReplica();
      yield* memory.put([said('f1', 'dima', 'indexer')], { read: { source: CHAT, through: 'f1' } });
      yield* memory.put([said('f2', 'dima', 'ui')], { read: { source: CHAT, through: 'f2' } });
      expect(yield* memory.query(MemoryQuery.cursor(CHAT))).toBe('f2');
    }).pipe(Effect.scoped),
  );

  it.effect('a store exports its memory and another imports it, in both formats', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const source = yield* openReplica();
      yield* source.memory.put([said('f1', 'dima', 'indexer'), said('f2', 'rich', 'ui')]);
      const facts = ids(yield* source.memory.query(MemoryQuery.facts()));
      const store = Context.get(source.context, RdfStore.RdfStore);
      for (const format of ['trig', 'binary'] as const) {
        const data = yield* store.export(format);
        const target = yield* openReplica();
        yield* Context.get(target.context, RdfStore.RdfStore).import(data, format);
        expect(ids(yield* target.memory.query(MemoryQuery.facts()))).toEqual(facts);
      }
    }).pipe(Effect.scoped),
  );

  it.effect('SPARQL that is not a SELECT is refused for rows', () =>
    Effect.gen(function* () {
      const { memory } = yield* openReplica();
      const error = yield* Effect.flip(memory.query(MemoryQuery.sparql('ASK { ?s ?p ?o }')));
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause instanceof Error && error.cause.message).toMatch(/SELECT/);
      expect(yield* memory.query(MemoryQuery.sparql('PREFIX x: <urn:x:> SELECT ?s WHERE { ?s x:p ?o }'))).toEqual([]);
    }).pipe(Effect.scoped),
  );
});
