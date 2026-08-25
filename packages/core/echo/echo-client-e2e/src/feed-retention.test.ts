//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

/**
 * Does a feed release its objects when the caller lets go of them?
 *
 * Retention is asserted with `WeakRef` liveness rather than a byte threshold: an integer count of
 * surviving objects is machine-independent, where a heap delta would need a tolerance band that a
 * loaded CI host defeats. Heap is measured at every checkpoint and printed regardless, since the
 * absolute footprint is the number the memory-usage project is targeting.
 *
 * Requires `--expose-gc`; the `memory` tag is gated on the same `DX_DEBUG_LEAKS` that supplies it:
 *
 *   DX_DEBUG_LEAKS=1 moon run echo-client-e2e:test -- src/feed-retention.test.ts
 *
 * TASKS: `.agents/projects/memory-usage/TASKS.md` (Phase 2, Linear DX-1148).
 */

const OBJECT_COUNT = 1000;
const HALF = OBJECT_COUNT / 2;

/** Large enough that per-object payload dominates fixed entity overhead and heap noise. */
const PAYLOAD_BYTES = 128 * 1024;

type Checkpoint = {
  label: string;
  heapUsed: number;
  external: number;
  rss: number;
  /** Objects from the original query still reachable, once refs are being tracked. */
  alive?: number;
  /** Residency reported by the database itself, for attributing the heap to a cache. */
  stats?: Database.DatabaseStats;
};

/**
 * Repeated collection with a macrotask turn between passes: a single `gc()` leaves
 * `FinalizationRegistry` callbacks and `WeakRef` clears pending, so a reading taken straight after
 * it still counts collected objects as live.
 */
const settle = async (): Promise<void> => {
  for (let iteration = 0; iteration < 3; iteration++) {
    global.gc?.();
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const aliveCount = (refs: WeakRef<object>[]): number => refs.filter((ref) => ref.deref() !== undefined).length;

/**
 * Settle, then read heap and (once the caller is tracking them) liveness. Both are sampled in the
 * same pass so the printed table and the assertions describe one moment rather than two.
 */
const capture = async (
  label: string,
  checkpoints: Checkpoint[],
  db: EchoDatabase,
  refs?: WeakRef<object>[],
): Promise<Checkpoint> => {
  await settle();
  const { heapUsed, external, rss } = process.memoryUsage();
  // Read after the memory sample: `stats()` walks the space on the host, so anything it allocates
  // belongs to the next checkpoint's settle rather than to this reading.
  const stats = await db.stats();
  const checkpoint = { label, heapUsed, external, rss, stats, ...(refs ? { alive: aliveCount(refs) } : {}) };
  checkpoints.push(checkpoint);
  return checkpoint;
};

const MB = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

const column = (value: number | string, width: number): string => String(value).padStart(width);

const report = (title: string, checkpoints: Checkpoint[]): void => {
  const floor = checkpoints[0].heapUsed;
  console.log(`\n[${title}] ${OBJECT_COUNT} objects x ${MB(PAYLOAD_BYTES)} = ${MB(OBJECT_COUNT * PAYLOAD_BYTES)}`);
  console.log(
    `  ${'checkpoint'.padEnd(32)}${column('heap', 9)}${column('delta', 9)}${column('rss', 9)}` +
      `${column('alive', 7)}${column('objs', 6)}${column('feeds', 6)}${column('feedObjs', 9)}` +
      `${column('docs.c', 8)}${column('docs.h', 8)}${column('queries', 8)}`,
  );
  for (const { label, heapUsed, rss, alive: live, stats } of checkpoints) {
    const delta = heapUsed - floor;
    const client = stats?.loaded.client;
    const host = stats?.loaded.host;
    console.log(
      `  ${label.padEnd(32)}${column(MB(heapUsed), 9)}${column((delta >= 0 ? '+' : '') + MB(delta), 9)}` +
        `${column(MB(rss), 9)}${column(live ?? '-', 7)}${column(client?.objects ?? '-', 6)}` +
        `${column(client?.feeds ?? '-', 6)}${column(client?.feedObjects ?? '-', 9)}` +
        `${column(client?.documents ?? '-', 8)}${column(host?.documents ?? '-', 8)}` +
        `${column(host?.queriesTotal ?? '-', 8)}`,
    );
  }
};

/** Unique per index so nothing can be deduplicated into a single shared string. */
const makePayload = (index: number): string => `${index}:${'x'.repeat(PAYLOAD_BYTES)}`;

const appendObjects = async (db: EchoDatabase, feed: Feed.Feed): Promise<void> => {
  const batchSize = 20;
  for (let start = 0; start < OBJECT_COUNT; start += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, OBJECT_COUNT - start) }, (_unused, offset) =>
      Obj.make(TestSchema.Task, { title: `task-${start + offset}`, description: makePayload(start + offset) }),
    );
    await db.appendToFeed(feed, batch);
  }
};

describe('feed object retention', { tags: ['memory'] }, () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Control: passes today. Establishes that the checkpoint/WeakRef machinery reports a release when
  // one genuinely happens, so a failure of the test below is retention and not a harness artifact.
  test('evicting the feed handle releases every object', { timeout: 120_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    await capture('A: empty database', checkpoints, db);

    const feed = db.add(Feed.make({ name: 'retention' }));
    await appendObjects(db, feed);
    await db.flush();
    // Evicted before the baseline is taken: the writing path materializes a core per appended
    // object, so without this A' would carry the whole working set and measure the writer rather
    // than the reader.
    await db.evictFeedHandle(feed);
    const baseline = await capture("A': on disk, handle evicted", checkpoints, db);

    let queried: Obj.Unknown[] | undefined = await db
      .query(Query.select(Filter.type(TestSchema.Task)).from(feed))
      .run();
    expect(queried.length).toBe(OBJECT_COUNT);
    const refs = queried.map((object) => new WeakRef(object));
    await capture('B: all held by the caller', checkpoints, db, refs);

    queried = undefined;
    await db.evictFeedHandle(feed);
    const evicted = await capture('E: handle evicted', checkpoints, db, refs);

    report('control', checkpoints);
    expect(evicted.alive).toBe(0);
    // Generous: the host keeps its own index/query state, which this bound is not trying to pin.
    expect(evicted.heapUsed - baseline.heapUsed).toBeLessThan(0.35 * OBJECT_COUNT * PAYLOAD_BYTES);
  });

  // FAILS TODAY. `FeedHandle` keeps `#cores` and `_objects` — both strong, both per-object, and
  // neither shrinks outside `delete()` or `dispose()` — so releasing the caller's reference frees
  // nothing and footprint tracks everything the feed has ever hydrated rather than what is open.
  test('dropping the caller reference releases feed objects', { timeout: 120_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    await capture('A: empty database', checkpoints, db);

    const feed = db.add(Feed.make({ name: 'retention' }));
    await appendObjects(db, feed);
    await db.flush();
    await db.evictFeedHandle(feed);
    await capture("A': on disk, handle evicted", checkpoints, db);

    let queried: Obj.Unknown[] = await db.query(Query.select(Filter.type(TestSchema.Task)).from(feed)).run();
    expect(queried.length).toBe(OBJECT_COUNT);
    const refs = queried.map((object) => new WeakRef(object));
    await capture('B: all held by the caller', checkpoints, db, refs);

    queried = queried.slice(0, HALF);
    const half = await capture('C: half held by the caller', checkpoints, db, refs);
    // Sampled here, not at the end: after D every ref is expected dead, so a tail reading taken
    // then would pass whether or not C released anything.
    const aliveTailAtHalf = aliveCount(refs.slice(HALF));

    queried = [];
    const none = await capture('D: none held by the caller', checkpoints, db, refs);

    report('retention', checkpoints);
    expect(aliveTailAtHalf).toBe(0);
    expect(half.alive).toBe(HALF);
    expect(none.alive).toBe(0);
  });
});
