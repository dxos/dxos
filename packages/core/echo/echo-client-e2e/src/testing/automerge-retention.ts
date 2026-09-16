//
// Copyright 2026 DXOS.org
//

import { Filter, Obj, Query } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { type EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { type Checkpoint, capture, makePayload } from './retention.ts';

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
 * Each test is its own file, so each gets a fresh process and WASM instance:
 *
 *   moon run echo-client-e2e:test-memory
 */

export const OBJECT_COUNT = 2000;
export const HALF = OBJECT_COUNT / 2;

/**
 * Far smaller than the feed suite's, and deliberately so: every object here is its own automerge
 * document, and every document accumulates in the one WASM instance its test file's process
 * owns — releasing a handle returns JS memory, never WASM memory. The amplification is severe — a few MB of payload costs an
 * order of magnitude more heap and two orders more WASM — and past roughly 12MB of total payload
 * the WASM allocator aborts mid-`loadIncremental` (`__rg_oom` into a `RuntimeError: unreachable`),
 * after which every automerge call in the process, on any document, fails with "recursive use of an
 * object detected". Raise these numbers and the suite stops measuring retention and starts
 * measuring that.
 */
export const PAYLOAD_BYTES = 1 * 1024;

export const SCALE = { objectCount: OBJECT_COUNT, payloadBytes: PAYLOAD_BYTES };

/**
 * Reads the whole set, retrying a short result: a cold read starts every hit's two-second
 * `INDEX_OBJECT_LOAD_TIMEOUT` at once while the documents arrive over the following minute.
 */
export const queryAll = async (db: EchoDatabase, expected: number): Promise<Obj.Unknown[]> => {
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
export const removeAll = (db: EchoDatabase, objects: Obj.Unknown[]): void => {
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
export const setupColdPeer = async (builder: EchoTestBuilder, checkpoints: Checkpoint[]) => {
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
