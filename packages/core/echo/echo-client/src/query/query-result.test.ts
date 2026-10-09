//
// Copyright 2026 DXOS.org
//

import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { Aggregate, Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { range } from '@dxos/util';

import { EchoTestBuilder, createTmpPath } from '../testing/index.ts';
import { type QueryContext, type SourceEntry } from './query-context.ts';
import { QueryResultImpl } from './query-result.ts';

describe('QueryResultImpl', () => {
  // Every result registers a diagnostic carrying a `StackTrace`, and an unformatted stack retains
  // the receiver of each frame it captured — the result under construction included. Holding those
  // diagnostics strongly therefore pinned the result, its query context, and the whole client graph
  // behind it, one graph per query, for the lifetime of the process. That OOMed long-lived hosts
  // (DX-1140). `QueryResultCache` is deliberately weak; this asserts the diagnostic doesn't defeat it.
  test('is collectable once dropped, despite the client-queries diagnostic', async ({ expect }) => {
    setFlagsFromString('--expose_gc');
    const gc: () => void = runInNewContext('gc');

    let live = 0;
    const registry = new FinalizationRegistry(() => {
      live--;
    });

    // Distinct queries so nothing dedupes, and no reference to any result survives the loop.
    for (let index = 0; index < 50; index++) {
      const query = Query.select(Filter.everything()).limit(index + 1);
      registry.register(new QueryResultImpl(makeQueryContext(), query), index);
      live++;
    }
    expect(live).toBe(50);

    await expect
      .poll(
        () => {
          gc();
          return live;
        },
        { timeout: 20_000 },
      )
      .toBe(0);
  });

  test('a local write is in the results before the index has answered', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    await builder.open();
    try {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const result = db.query(Filter.type(TestSchema.Person));
      const unsubscribe = result.subscribe();
      try {
        const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
        // In the same turn as the write, so the index cannot have answered.
        expect(result.runSync()).toEqual([alice]);

        await db.flush({ indexes: true });
        await expect.poll(() => result.runSync()).toEqual([alice]);
      } finally {
        unsubscribe();
      }
    } finally {
      await builder.close();
    }
  });

  test('releasing a subscription twice does not stop the query under another subscriber', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    await builder.open();
    try {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      // Both reads hit the one cached result, as two components on the same query do.
      const result = db.query(Filter.type(TestSchema.Person));
      expect(db.query(Filter.type(TestSchema.Person))).toBe(result);

      const unsubscribeFirst = result.subscribe();
      unsubscribeFirst();
      unsubscribeFirst();

      const unsubscribeSecond = result.subscribe();
      try {
        expect(() => result.results).not.toThrow();
      } finally {
        unsubscribeSecond();
      }
      expect(() => result.results).toThrow(/at least 1 subscriber/);
    } finally {
      await builder.close();
    }
  });

  test('objects the tab has not loaded arrive from the index and complete the result', async ({ expect }) => {
    const tmpPath = createTmpPath();
    const builder = new EchoTestBuilder();
    await builder.open();
    try {
      const spaceKey = PublicKey.random();
      let rootUrl: string;
      {
        const peer = await builder.createPeer({ types: [TestSchema.Person], storagePath: tmpPath });
        const db = await peer.createDatabase(spaceKey);
        range(3).forEach((index) => db.add(Obj.make(TestSchema.Person, { name: `person-${index}` })));
        await db.flush({ indexes: true });
        invariant(db.rootUrl);
        rootUrl = db.rootUrl;
        await peer.close();
      }

      const peer = await builder.createPeer({ types: [TestSchema.Person], storagePath: tmpPath });
      const db = await peer.openDatabase(spaceKey, rootUrl);
      const result = db.query(Filter.type(TestSchema.Person));
      const unsubscribe = result.subscribe();
      try {
        // Nothing is loaded yet, so the working set answers with nothing.
        expect(result.runSync()).toEqual([]);

        await expect.poll(() => result.runSync()).toHaveLength(3);
      } finally {
        unsubscribe();
      }
    } finally {
      await builder.close();
    }
  });

  test('a grouped count excludes the tombstones the presentation collapsed', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    await builder.open();
    try {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const people = [
        db.add(Obj.make(TestSchema.Person, { name: 'Alice', age: 30 })),
        db.add(Obj.make(TestSchema.Person, { name: 'Bob', age: 30 })),
        db.add(Obj.make(TestSchema.Person, { name: 'Carol', age: 30 })),
      ];
      await db.flush();
      db.remove(people[2]);
      await db.flush();

      // The source counts every member it grouped, tombstones included; the client drops the tombstone
      // from the members, so the count it reports alongside them has to follow.
      const group = { key: { age: 30 }, count: 3 };
      const entries: SourceEntry[] = people.map((person) => ({ id: person.id, result: person, group }));
      // Aggregate rows are not entities; the result is typed over the row as the graph types it.
      const query: Query.Any = Query.select(Filter.type(TestSchema.Person)).aggregate({
        age: Aggregate.group('age'),
        count: Aggregate.count(),
        items: Aggregate.items(),
      });
      const [row, ...rest] = new QueryResultImpl(makeQueryContext(entries), query).runSync();
      expect(rest).toEqual([]);
      expect(row).toMatchObject({ age: 30, count: 2 });
      expect(row.items).toHaveLength(2);
      expect(row.items).toContain(people[0]);
      expect(row.items).toContain(people[1]);
    } finally {
      await builder.close();
    }
  });

  test('a collapsed group record is presented from the source values, with nothing to hydrate', async ({ expect }) => {
    // What the index source emits for a host-collapsed group: a key, a size, the host's aggregates,
    // and no object.
    const entries: SourceEntry[] = [
      { id: '{"kind":"a"}', group: { key: { kind: 'a' }, count: 3, aggregates: { count: 3 } } },
      { id: '{"kind":"b"}', group: { key: { kind: 'b' }, count: 1, aggregates: { count: 1 } } },
    ];
    const query: Query.Any = Query.select(Filter.everything()).aggregate({
      kind: Aggregate.group('kind'),
      count: Aggregate.count(),
    });
    const rows = new QueryResultImpl(makeQueryContext(entries), query).runSync();
    expect(rows).toEqual([
      { kind: 'a', count: 3 },
      { kind: 'b', count: 1 },
    ]);
  });
});

const makeQueryContext = (results: SourceEntry[] = []): QueryContext => ({
  getResults: () => results,
  isSynchronous: () => true,
  hasPendingSources: () => false,
  changed: new Event<void>(),
  run: async () => [],
  update: () => {},
  start: () => {},
  stop: () => {},
});
