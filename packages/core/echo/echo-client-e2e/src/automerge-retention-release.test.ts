//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { HALF, OBJECT_COUNT, SCALE, queryAll, setupColdPeer } from './testing/automerge-retention.ts';
import { type Checkpoint, aliveCount, capture, report } from './testing/retention.ts';

describe('automerge object retention: caller release', { tags: ['memory'] }, () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
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
