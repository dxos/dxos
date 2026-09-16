//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { OBJECT_COUNT, SCALE, queryAll, removeAll, setupColdPeer } from './testing/automerge-retention.ts';
import { type Checkpoint, capture, report } from './testing/retention.ts';

describe('automerge object retention: collection', { tags: ['memory'] }, () => {
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
});
