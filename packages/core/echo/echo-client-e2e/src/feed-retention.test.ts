//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { type Checkpoint, aliveCount, capture, makePayload, report } from './testing/retention';

/**
 * Does a feed release its objects when the caller lets go of them? Harness and rationale:
 * `./testing/retention.ts`.
 *
 *   DX_DEBUG_LEAKS=1 moon run echo-client-e2e:test -- src/feed-retention.test.ts
 */

const OBJECT_COUNT = 1000;
const HALF = OBJECT_COUNT / 2;

/** Large enough that per-object payload dominates fixed entity overhead and heap noise. */
const PAYLOAD_BYTES = 128 * 1024;

const SCALE = { objectCount: OBJECT_COUNT, payloadBytes: PAYLOAD_BYTES };

const appendObjects = async (db: EchoDatabase, feed: Feed.Feed): Promise<void> => {
  const batchSize = 20;
  for (let start = 0; start < OBJECT_COUNT; start += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, OBJECT_COUNT - start) }, (_unused, offset) =>
      Obj.make(TestSchema.Task, {
        title: `task-${start + offset}`,
        description: makePayload(start + offset, PAYLOAD_BYTES),
      }),
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
    await capture('0: empty client, no data', checkpoints, db);

    const feed = db.add(Feed.make({ name: 'retention' }));
    await appendObjects(db, feed);
    await db.flush();
    // Evicted before the baseline is taken: the writing path materializes a core per appended
    // object, so without this A would carry the whole working set and measure the writer rather
    // than the reader.
    await db.evictFeedHandle(feed);
    const baseline = await capture('A: data on disk, handle evicted', checkpoints, db);

    let queried: Obj.Unknown[] | undefined = await db
      .query(Query.select(Filter.type(TestSchema.Task)).from(feed))
      .run();
    expect(queried.length).toBe(OBJECT_COUNT);
    const refs = queried.map((object) => new WeakRef(object));
    const held = await capture('B: all held by the caller', checkpoints, db, refs);

    queried = undefined;
    await db.evictFeedHandle(feed);
    const evicted = await capture('E: handle evicted', checkpoints, db, refs);

    report('control', checkpoints, SCALE);
    expect(evicted.alive).toBe(0);
    // At least two thirds of what holding the objects cost is given back. Stated against the
    // measured cost rather than the raw payload, which is only a fraction of what an object
    // actually occupies and would make the bound depend on the suite's constants.
    expect(evicted.heapUsed - baseline.heapUsed).toBeLessThan(0.35 * (held.heapUsed - baseline.heapUsed));
  });

  // Regression guard for the strong `#cores` / `_objects` pair this replaced: a feed's footprint
  // used to track everything it had ever hydrated rather than what the caller still holds.
  test('dropping the caller reference releases feed objects', { timeout: 120_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    await capture('0: empty client, no data', checkpoints, db);

    const feed = db.add(Feed.make({ name: 'retention' }));
    await appendObjects(db, feed);
    await db.flush();
    await db.evictFeedHandle(feed);
    await capture('A: data on disk, handle evicted', checkpoints, db);

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

    report('retention', checkpoints, SCALE);
    expect(aliveTailAtHalf).toBe(0);
    expect(half.alive).toBe(HALF);
    expect(none.alive).toBe(0);
  });
});
