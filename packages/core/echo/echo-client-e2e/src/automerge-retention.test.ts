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
 * Unlike a feed object, an ECHO object is a thin proxy over an automerge document, so the payload is
 * not in the entity — it is in the document. So `docs.c` / `docs.h` matter as much as `objs` here,
 * and releasing entities alone would not return the memory: an entity is released with its core, and
 * an unlinked object's document is released with the last object mounted in it.
 *
 * Residency (`objs`, `docs.c`) is asserted rather than a heap delta, for the reason the harness gives
 * for preferring `WeakRef` liveness to bytes: the absolute footprint of an automerge-backed suite is
 * dominated by WASM and by allocator state that no release returns, so a byte threshold measures the
 * host it runs on. Heap is still printed at every checkpoint.
 *
 *   DX_DEBUG_LEAKS=1 moon run echo-client-e2e:test -- src/automerge-retention.test.ts
 */

const OBJECT_COUNT = 2000;
const HALF = OBJECT_COUNT / 2;

/**
 * Far smaller than the feed suite's, and deliberately so: every object here is its own automerge
 * document, and both tests' documents accumulate in the one WASM instance this file's process
 * shares — releasing a handle returns JS memory, never WASM memory. The amplification is severe — a few MB of payload costs an
 * order of magnitude more heap and two orders more WASM — and past roughly 12MB of total payload
 * the WASM allocator aborts mid-`loadIncremental` (`__rg_oom` into a `RuntimeError: unreachable`),
 * after which every automerge call in the process, on any document, fails with "recursive use of an
 * object detected". Raise these numbers and the suite stops measuring retention and starts
 * measuring that.
 */
const PAYLOAD_BYTES = 1 * 1024;

const SCALE = { objectCount: OBJECT_COUNT, payloadBytes: PAYLOAD_BYTES };

/**
 * Reads the whole set, retrying a short result: a cold read starts every hit's two-second
 * `INDEX_OBJECT_LOAD_TIMEOUT` at once while the documents arrive over the following minute.
 */
const queryAll = async (db: EchoDatabase, expected: number): Promise<Obj.Unknown[]> => {
  let objects: Obj.Unknown[] = [];
  for (let attempt = 0; attempt < 5 && objects.length < expected; attempt++) {
    if (attempt > 0) {
      // An immediate retry would re-read the same not-yet-loaded state.
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    objects = await db.query(Query.select(Filter.type(TestSchema.Task))).run();
  }
  return objects;
};

/** @see the call site: a nested frame, so no stack slot outlives the removal. */
const removeAll = (db: EchoDatabase, objects: Obj.Unknown[]): void => {
  for (const object of objects) {
    db.remove(object);
  }
};

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
 *
 * Takes checkpoint 0 against the open-but-empty client, before a single object exists, so every
 * later delta is read against a real floor rather than against a client that already holds data.
 */
const setupColdPeer = async (builder: EchoTestBuilder, checkpoints: Checkpoint[]) => {
  const peer = await builder.createPeer({ types: [TestSchema.Task] });
  const writer = await peer.createDatabase();
  await capture('0: empty client, no data', checkpoints, writer);

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

  // Collection is the strongest release the client has: it unlinks the objects from the space
  // directory, which drives `EntityManager._evictRemovedObjects` — and that now takes each object's
  // document with it, on both sides (`docs.c` and `docs.h` back to the space root alone) rather than
  // leaving the client's repo proxy holding a handle per document.
  test('collecting removed objects releases them', { timeout: 300_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    const { peer, db } = await setupColdPeer(builder, checkpoints);
    await using _peer = peer;
    const baseline = await capture('A: cold client, data on disk', checkpoints, db);

    let queried: Obj.Unknown[] | undefined = await queryAll(db, OBJECT_COUNT);
    expect(queried.length).toBe(OBJECT_COUNT);
    const refs = queried.map((object) => new WeakRef(object));
    const held = await capture('B: all held by the caller', checkpoints, db, refs);

    // Removed from inside a helper so its frame — and the loop variable holding the last object —
    // is gone before the reading: a live stack slot keeps one object alive and reads as retention.
    removeAll(db, queried);
    await db.flush();
    // Removal alone is a soft delete — the object stays in the space directory, so nothing evicts.
    // Collection is what unlinks it, which is what `_evictRemovedObjects` watches for.
    await db.runGarbageCollection();
    await db.flush();
    queried = undefined;
    const removed = await capture('E: objects removed and collected', checkpoints, db, refs);

    report('after collection', checkpoints, SCALE);
    expect(removed.alive).toBe(0);
    // The client holds nothing for the space beyond its root document.
    expect(removed.stats?.loaded.client.objects).toBe(0);
    expect(removed.stats?.loaded.client.documents).toBe(1);
    // A sanity ceiling on the heap, not the measurement: the objects cost something to hold, and
    // most of it comes back. See the file comment on why this is not a tight budget.
    expect(removed.heapUsed - baseline.heapUsed).toBeLessThan(held.heapUsed - baseline.heapUsed);
  });

  // `EntityManager._objects` used to hold an `ObjectCore` per object and shrink only when an object
  // left the space directory — never because the caller dropped it — so a space's client-side
  // footprint tracked everything it had ever loaded rather than what is open. This is the
  // automerge-side twin of the feed bug fixed in `FeedCoreRegistry`.
  test('dropping the caller reference releases objects', { timeout: 300_000 }, async ({ expect }) => {
    expect(typeof global.gc).toBe('function');

    const checkpoints: Checkpoint[] = [];
    const { peer, db } = await setupColdPeer(builder, checkpoints);
    await using _peer = peer;
    await capture('A: cold client, data on disk', checkpoints, db);

    let queried: Obj.Unknown[] = await queryAll(db, OBJECT_COUNT);
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
