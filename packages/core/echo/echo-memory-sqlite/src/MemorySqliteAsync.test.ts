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

const WATCH = Subscription.SubscriptionId.make('watch');
const CHAT = Fact.SourceUri.make('chat:general');

const ids = (facts: readonly Fact.Fact[]) => facts.map(({ id }) => id).sort();

const Sqlite = () => SqliteClient.layer({ filename: ':memory:' });

describe('MemorySqlite.makeAsync', () => {
  it.effect('stores, queries, wakes, drains and resets over an async connection', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const memory = yield* MemorySqlite.makeAsync();
      yield* memory.subscribe({
        id: WATCH,
        owner: Fact.EntityKey.make('agent'),
        rules: 'wake(dima) :- speaker(F, dima).',
        createdAt: new Date(START).toISOString(),
      });

      expect(yield* memory.put([said('f1', 'dima', 'indexer')], { read: { source: CHAT, through: 'f1' } })).toBe(1);
      expect(ids(yield* memory.query(MemoryQuery.facts({ entity: Fact.EntityKey.make('indexer') })))).toEqual(['f1']);
      expect(yield* memory.query(MemoryQuery.cursor(CHAT))).toBe('f1');

      const events = yield* memory.take(WATCH);
      expect(events).toHaveLength(1);
      yield* memory.ack(
        WATCH,
        events.map(({ id }) => id),
      );
      expect(yield* memory.take(WATCH)).toEqual([]);

      yield* memory.reset();
      expect(yield* memory.query(MemoryQuery.facts())).toEqual([]);
      expect((yield* memory.subscriptions(Fact.EntityKey.make('agent'))).map(({ id }) => id)).toEqual(['watch']);
      expect(yield* memory.unsubscribe(WATCH)).toBe(true);
    }).pipe(Effect.scoped, Effect.provide(Sqlite())),
  );

  it.effect('memories under different prefixes share one connection without sharing facts', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const first = yield* MemorySqlite.makeAsync({ prefix: 'mem_a_' });
      const second = yield* MemorySqlite.makeAsync({ prefix: 'mem_b_' });
      yield* first.put([said('f1', 'dima', 'indexer')], { read: { source: CHAT, through: 'f1' } });
      expect(ids(yield* first.query(MemoryQuery.facts()))).toEqual(['f1']);
      expect(yield* second.query(MemoryQuery.facts())).toEqual([]);
      expect(yield* second.query(MemoryQuery.cursor(CHAT))).toBeUndefined();
    }).pipe(Effect.scoped, Effect.provide(Sqlite())),
  );

  it.effect('time-driven rules wake by themselves', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const memory = yield* MemorySqlite.makeAsync();
      yield* memory.subscribe({
        id: WATCH,
        rules: 'wake(practice) :- every(1d).',
        createdAt: new Date(START).toISOString(),
      });
      yield* TestClock.adjust('25 hours');
      expect((yield* memory.take(WATCH)).map(({ label }) => label)).toEqual(['practice']);
    }).pipe(Effect.scoped, Effect.provide(Sqlite())),
  );

  it.effect('the backend shape: feed and memory share one connection, and the store rebuilds from the feed', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(START);
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      // One host database with the feed store, written through a memory and then dropped.
      const feeds = new FeedStore({ localActorId: 'host', assignPositions: false });
      yield* feeds.migrate();
      const log = yield* FactLog.feed({ feeds, spaceId, feedId });
      const memory = yield* MemorySqlite.makeAsync({ log });
      yield* memory.put([said('f1', 'dima', 'indexer'), said('f2', 'rich', 'ui')], {
        read: { source: CHAT, through: 'f2' },
      });
      expect(ids(yield* memory.query(MemoryQuery.facts()))).toEqual(['f1', 'f2']);

      // A second database that has never seen these facts rebuilds them from the same feed.
      const rebuilt = yield* Layer.build(
        Layer.effect(MemoryService.MemoryService, MemorySqlite.makeAsync({ log })).pipe(Layer.provide(Sqlite())),
      ).pipe(Effect.map(Context.get(MemoryService.MemoryService)));
      expect(ids(yield* rebuilt.query(MemoryQuery.facts()))).toEqual(['f1', 'f2']);
      expect(yield* rebuilt.query(MemoryQuery.cursor(CHAT))).toBe('f2');
    }).pipe(Effect.scoped, Effect.provide(Sqlite())),
  );
});
