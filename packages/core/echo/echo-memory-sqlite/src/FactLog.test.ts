//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';

import { Fact, MemoryQuery, MemoryService, Subscription } from '@dxos/echo-memory';
import { FeedStore } from '@dxos/feed';
import { EntityId, SpaceId } from '@dxos/keys';
import * as SqliteStorage from '@dxos/sql-sqlite/SqlStorage';

import * as FactLog from './FactLog.ts';
import * as MemorySqlite from './MemorySqlite.ts';

const START = Date.parse('2027-01-04T09:00:00.000Z');

const said = (id: string, speaker: string, object: string): Fact.Fact =>
  Fact.decode([
    {
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
    },
  ])[0];

const CHAT = Fact.SourceUri.make('chat:general');

/** A memory over its own private SQLite database, so each replica's store starts empty. */
const openMemory = (log: FactLog.FactLog) =>
  Layer.build(
    Layer.effect(
      MemoryService.MemoryService,
      Effect.acquireRelease(SqliteStorage.makeMemory(), (database) => Effect.sync(() => database.close())).pipe(
        Effect.orDie,
        Effect.flatMap((database) => MemorySqlite.make(database, { log })),
      ),
    ),
  ).pipe(Effect.map(Context.get(MemoryService.MemoryService)));

const ids = (facts: readonly Fact.Fact[]) => facts.map(({ id }) => id).sort();

/** Lets the replicas' log-follower fibers run. */
const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 20 }));

describe('FactLog', () => {
  it.effect('an empty store rebuilds itself from the log', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const log = FactLog.memory();
      const first = yield* openMemory(log);
      yield* first.put([said('f1', 'dima', 'indexer'), said('f2', 'rich', 'ui')], {
        read: { source: CHAT, through: 'f2' },
      });

      const rebuilt = yield* openMemory(log);
      expect(ids(yield* rebuilt.query(MemoryQuery.facts()))).toEqual(['f1', 'f2']);
      expect(yield* rebuilt.query(MemoryQuery.cursor(CHAT))).toBe('f2');
    }).pipe(Effect.scoped),
  );

  it.effect('a reset is replayed from the log too', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const log = FactLog.memory();
      const first = yield* openMemory(log);
      yield* first.put([said('f1', 'dima', 'indexer')]);
      yield* first.reset();
      yield* first.put([said('f2', 'rich', 'ui')]);

      const rebuilt = yield* openMemory(log);
      expect(ids(yield* rebuilt.query(MemoryQuery.facts()))).toEqual(['f2']);
    }).pipe(Effect.scoped),
  );

  it.effect('a replica follows what another writes and wakes its own subscriptions', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const log = FactLog.memory();
      const writer = yield* openMemory(log);
      const reader = yield* openMemory(log);
      yield* reader.subscribe({
        id: Subscription.SubscriptionId.make('watch'),
        rules: 'wake(dima) :- speaker(F, dima).',
        createdAt: new Date(START).toISOString(),
      });

      yield* writer.put([said('f1', 'dima', 'indexer')]);
      yield* settle;
      expect(ids(yield* reader.query(MemoryQuery.facts()))).toEqual(['f1']);
      expect(yield* reader.take(Subscription.SubscriptionId.make('watch'))).toHaveLength(1);
    }).pipe(Effect.scoped),
  );

  it.effect('the store rebuilds from a feed in the facts namespace', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const feeds = new FeedStore({ localActorId: 'alice', assignPositions: false });
      yield* feeds.migrate();
      const log = yield* FactLog.feed({ feeds, spaceId: SpaceId.random(), feedId: EntityId.random() });

      const first = yield* openMemory(log);
      yield* first.put([said('f1', 'dima', 'indexer')], { read: { source: CHAT, through: 'f1' } });
      yield* first.put([said('f2', 'rich', 'ui')], { read: { source: CHAT, through: 'f2' } });

      const rebuilt = yield* openMemory(log);
      expect(ids(yield* rebuilt.query(MemoryQuery.facts()))).toEqual(['f1', 'f2']);
      expect(yield* rebuilt.query(MemoryQuery.cursor(CHAT))).toBe('f2');

      // The rebuilt replica keeps following the feed.
      yield* first.put([said('f3', 'kai', 'indexer')]);
      yield* settle;
      expect(ids(yield* rebuilt.query(MemoryQuery.facts()))).toEqual(['f1', 'f2', 'f3']);
    }).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );

  it('an entry survives its byte encoding', () => {
    const entry: FactLog.Entry = {
      _tag: 'put',
      facts: [said('f1', 'dima', 'indexer')],
      read: { source: CHAT, through: 'f1' },
      quiet: [Fact.EntityKey.make('dima')],
    };
    expect(FactLog.fromBytes(FactLog.toBytes(entry))).toEqual(entry);
  });
});
