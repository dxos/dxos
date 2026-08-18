//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, createTmpPath } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { type BenchResult, parseBenchCount, printResults, runBench } from './testing/bench-util';

// Same 5 operations as `sqlite-benchmarks.test.ts`, run through the ECHO API instead of raw SQL,
// against a real file-backed SQLite database (`storagePath`, not `:memory:`). Run once per object
// storage kind: automerge objects (`db.add`, the default CRDT-backed document tree) and feed
// objects (`db.add(obj, { to: feed })`, the append-only queue path) — the matrix the task asked for.
const N = parseBenchCount('ECHO_BENCH_N', 100);
const SCAN_OPS = parseBenchCount('ECHO_BENCH_SCAN_OPS', 10);

type Variant = {
  name: string;
  insert: (i: number) => Promise<TestSchema.Expando>;
  scope: (filter: Filter.Any) => Query.Any;
  remove: (obj: TestSchema.Expando) => Promise<void>;
};

describe('echo benchmarks (feed objects vs automerge objects)', { tags: ['manual'], timeout: 180_000 }, () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Expando], storagePath: createTmpPath() });
    db = await peer.createDatabase();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('insert, select, update, delete', async () => {
    const feed = db.add(Feed.make({ name: 'bench' }));
    await db.flush();

    const variants: Variant[] = [
      {
        name: 'automerge object',
        insert: async (i) => {
          const obj = db.add(Obj.make(TestSchema.Expando, { value: i, label: `label-${i}` }));
          await db.flush();
          return obj;
        },
        scope: (filter) => Query.select(filter),
        remove: async (obj) => {
          db.remove(obj);
          await db.flush();
        },
      },
      {
        name: 'feed object',
        insert: async (i) => {
          const obj = db.add(Obj.make(TestSchema.Expando, { value: i, label: `label-${i}` }), { to: feed });
          await db.flush();
          return obj;
        },
        scope: (filter) => Query.select(filter).from(feed),
        remove: async (obj) => {
          await db.removeFeedItemsByIds(feed, [obj.id]);
          await db.flush();
        },
      },
    ];

    for (const variant of variants) {
      const results: BenchResult[] = [];
      const objects: TestSchema.Expando[] = [];

      results.push(
        await runBench('insert', N, async (i) => {
          objects.push(await variant.insert(i));
        }),
      );

      results.push(
        await runBench('select (point, by id)', N, async (i) => {
          await db.query(variant.scope(Filter.id(objects[N - 1 - i].id))).run();
        }),
      );

      results.push(
        await runBench('select (filtered scan)', SCAN_OPS, async (i) => {
          const lo = (i * 7) % N;
          const range = Filter.and(
            Filter.type(TestSchema.Expando),
            Filter.props({ value: Filter.between(lo, lo + N / 10) }),
          );
          await db.query(variant.scope(range)).run();
        }),
      );

      results.push(
        await runBench('update (point, by id)', N, async (i) => {
          Obj.update(objects[i], (obj) => {
            obj.value = i + N;
          });
          await db.flush();
        }),
      );

      results.push(
        await runBench('delete (point, by id)', N, async (i) => {
          await variant.remove(objects[i]);
        }),
      );

      printResults(`ECHO — ${variant.name} (N=${N})`, results);
    }
  });
});
