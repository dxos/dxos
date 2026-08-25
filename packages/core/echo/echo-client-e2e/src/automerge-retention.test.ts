//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { type Checkpoint, aliveCount, capture, makePayload, report } from './testing/retention';

/**
 * The automerge-backed counterpart to `feed-retention.test.ts`: does a space release its objects
 * when the caller lets go of them? Harness and rationale: `./testing/retention.ts`.
 *
 * BOTH TESTS ARE RED — they assert the behavior we want, not the behavior we have. The sibling feed
 * suite is what validates the harness: it runs the same helpers in the same package and does reach
 * `alive 0`, so a non-zero count here is retention rather than a measurement artifact.
 *
 * Unlike a feed object, an ECHO object is a thin proxy over an automerge document, so the payload is
 * not in the entity — it is in the document, and in the JS patch objects hanging off it. Heap-
 * snapshot retainer chains at checkpoint E put ~500 of the payload strings behind
 * `mostRecentPatch.patches[].value` (a second copy of every changed value) and behind
 * `DocHandle.#document` via `DocSynchronizer` and `HandleRegistry`. So `docs.c` / `docs.h` matter as
 * much as `objs` here, and releasing entities alone would not return the memory.
 *
 *   DX_DEBUG_LEAKS=1 moon run echo-client-e2e:test -- src/automerge-retention.test.ts
 */

const OBJECT_COUNT = 200;
const HALF = OBJECT_COUNT / 2;

/** Smaller than the feed suite's: every object here is its own automerge document. */
const PAYLOAD_BYTES = 64 * 1024;

const SCALE = { objectCount: OBJECT_COUNT, payloadBytes: PAYLOAD_BYTES };

const addObjects = async (db: EchoDatabase): Promise<void> => {
  const batchSize = 20;
  for (let start = 0; start < OBJECT_COUNT; start += batchSize) {
    for (let offset = 0; offset < Math.min(batchSize, OBJECT_COUNT - start); offset++) {
      const index = start + offset;
      db.add(Obj.make(TestSchema.Task, { title: `task-${index}`, description: makePayload(index, PAYLOAD_BYTES) }));
    }
    await db.flush();
  }
};

/**
 * Writes the objects, then reopens the peer so the reading client starts cold. Without the reopen
 * the writer's own cores would already hold the whole working set and every later checkpoint would
 * measure the writer rather than the reader.
 */
const setupColdPeer = async (builder: EchoTestBuilder) => {
  const peer = await builder.createPeer({ types: [TestSchema.Task] });
  const writer = await peer.createDatabase();
  await addObjects(writer);
  await writer.flush();
  await peer.host.updateIndexes();

  await peer.close();
  await peer.open();
  return { peer, db: await peer.openLastDatabase() };
};

describe('automerge object retention', { tags: ['memory'] }, () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // FAILS TODAY. Collection is the strongest release the client has — it unlinks the objects from
  // the space directory, which drives `EntityManager._evictRemovedObjects` (`objs` 200 -> 0) and
  // drops the host's handles (`docs.h` 201 -> 1). The objects are still reachable afterwards, and
  // the client's own repo proxy still holds a handle per document, so eviction from the caches that
  // do evict is not the same as release. `peer.close()` is weaker still: it leaves `_objects`
  // populated entirely.
  test('collecting removed objects releases them', { timeout: 300_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    const { peer, db } = await setupColdPeer(builder);
    await using _peer = peer;
    const baseline = await capture('A: cold client, data on disk', checkpoints, db);

    let queried: Obj.Unknown[] | undefined = await db.query(Query.select(Filter.type(TestSchema.Task))).run();
    expect(queried.length).toBe(OBJECT_COUNT);
    const refs = queried.map((object) => new WeakRef(object));
    await capture('B: all held by the caller', checkpoints, db, refs);

    for (const object of queried) {
      db.remove(object);
    }
    await db.flush();
    // Removal alone is a soft delete — the object stays in the space directory, so nothing evicts.
    // Collection is what unlinks it, which is what `_evictRemovedObjects` watches for.
    await db.runGarbageCollection();
    await db.flush();
    queried = undefined;
    const removed = await capture('E: objects removed and collected', checkpoints, db, refs);

    report('after collection', checkpoints, SCALE);
    expect(removed.alive).toBe(0);
    expect(removed.heapUsed - baseline.heapUsed).toBeLessThan(0.35 * OBJECT_COUNT * PAYLOAD_BYTES);
  });

  // FAILS TODAY. `EntityManager._objects` holds an `ObjectCore` per object and only ever shrinks
  // when an object leaves the space directory (see above) — never because the caller dropped it —
  // so a space's client-side footprint tracks everything it has ever loaded rather than what is
  // open. This is the automerge-side twin of the feed bug fixed in `FeedCoreRegistry`.
  test('dropping the caller reference releases objects', { timeout: 300_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    const { peer, db } = await setupColdPeer(builder);
    await using _peer = peer;
    await capture('A: cold client, data on disk', checkpoints, db);

    let queried: Obj.Unknown[] = await db.query(Query.select(Filter.type(TestSchema.Task))).run();
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
