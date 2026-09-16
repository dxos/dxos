//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

/**
 * Drives the release paths reachable without a collector — removal, `retainObjects`, host garbage
 * collection, reopen — because release must not cost correctness on a runner that has none.
 */
describe('object release', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('an object outlives a sibling whose document was released', async ({ expect }) => {
    const { db } = await setup(builder);
    const kept = db.add(Obj.make(TestSchema.Task, { title: 'kept' }));
    const dropped = db.add(Obj.make(TestSchema.Task, { title: 'dropped' }));
    await db.flush();

    db.remove(dropped);
    await db.flush();
    await db.runGarbageCollection();
    await db.flush();

    // The surviving object is still readable AND writable: releasing its sibling's document must not
    // touch the space root both are linked from, nor the document this one is mounted in.
    expect(Obj.getSnapshot(kept).title).toBe('kept');
    Obj.update(kept, (kept) => {
      kept.title = 'kept, and edited';
    });
    await db.flush();
    expect(await db.query(Query.select(Filter.type(TestSchema.Task))).run()).toHaveLength(1);
    expect(db.getObjectById<any>(kept.id)?.title).toBe('kept, and edited');
  });

  test('a write to an object whose document was just released still lands', async ({ expect }) => {
    const { peer, db } = await setup(builder);
    const held = db.add(Obj.make(TestSchema.Task, { title: 'held' }));
    const removed = db.add(Obj.make(TestSchema.Task, { title: 'removed' }));
    await db.flush();

    // Removal drives eviction, which releases the removed object's document; the write below is
    // issued in the same turn, so a release that took the wrong handle would lose it.
    db.remove(removed);
    Obj.update(held, (held) => {
      held.title = 'written across a release';
    });
    await db.flush();
    await db.runGarbageCollection();
    await db.flush();

    // Queried, not `getObjectById`: that reads the working set, which a cold client has not filled.
    const reopened = await reopen(peer);
    const [reloaded] = await reopened.query(Query.select(Filter.id(held.id))).run();
    expect((reloaded as any).title).toBe('written across a release');
  });

  test('retainObjects keeps the retained objects usable', async ({ expect }) => {
    const { peer, db } = await setup(builder);
    const objects = Array.from({ length: 8 }, (_, index) =>
      db.add(Obj.make(TestSchema.Task, { title: `task-${index}` })),
    );
    await db.flush();
    const retained = objects.slice(0, 3).map((object) => object.id);

    const dropped = db.retainObjects(retained);
    await db.flush();

    expect(dropped).toHaveLength(5);
    for (const id of retained) {
      const object = db.getObjectById<any>(id);
      expect(object).toBeDefined();
      Obj.update(object!, (mutable: any) => {
        mutable.title = `${mutable.title} (retained)`;
      });
    }
    await db.flush();

    const reopened = await reopen(peer);
    const results = await reopened.query(Query.select(Filter.type(TestSchema.Task))).run();
    expect(results).toHaveLength(3);
    expect(results.map((object: any) => object.title).sort()).toEqual([
      'task-0 (retained)',
      'task-1 (retained)',
      'task-2 (retained)',
    ]);
  });

  test('a re-read after release returns the same instance as the query', async ({ expect }) => {
    const { peer, db } = await setup(builder);
    const created = db.add(Obj.make(TestSchema.Task, { title: 'identity' }));
    await db.flush();
    await peer.host.updateIndexes();

    const reopened = await reopen(peer);
    const [queried] = await reopened.query(Query.select(Filter.id(created.id))).run();
    // One core per id: a rebuilt core handed out beside a live one would split writes between two
    // proxies over one document.
    expect(reopened.getObjectById(created.id)).toBe(queried);
    const [requeried] = await reopened.query(Query.select(Filter.id(created.id))).run();
    expect(requeried).toBe(queried);
  });

  test('a reference resolves after its target has been read and released', async ({ expect }) => {
    const { peer, db } = await setup(builder);
    const target = db.add(Obj.make(TestSchema.Task, { title: 'target' }));
    const source = db.add(Obj.make(TestSchema.Task, { title: 'source', previous: Ref.make(target) }));
    await db.flush();
    await peer.host.updateIndexes();

    const reopened = await reopen(peer);
    const [loaded] = await reopened.query(Query.select(Filter.id(source.id))).run();
    // Twice: the second load goes through a resolver op that has already been satisfied once, which
    // is the state a released result leaves behind.
    expect(((await (loaded as any).previous.load()) as any).title).toBe('target');
    expect(((await (loaded as any).previous.load()) as any).title).toBe('target');
  });

  test('the space still creates and reads objects after a release', async ({ expect }) => {
    const { peer, db } = await setup(builder);
    const removed = db.add(Obj.make(TestSchema.Task, { title: 'first life' }));
    const removedId = removed.id;
    await db.flush();

    db.remove(removed);
    await db.flush();
    await db.runGarbageCollection();
    await db.flush();
    expect(db.getObjectById(removedId)).toBeUndefined();

    // Written after the release: a stale document binding or in-flight load entry left behind would
    // strand this object's own load rather than the released one's.
    const created = db.add(Obj.make(TestSchema.Task, { title: 'second life' }));
    await db.flush();
    await peer.host.updateIndexes();

    const reopened = await reopen(peer);
    const [reloaded] = await reopened.query(Query.select(Filter.id(created.id))).run();
    expect((reloaded as any).title).toBe('second life');
    expect(await reopened.query(Query.select(Filter.id(removedId))).run()).toHaveLength(0);
  });

  test('a query still sees every object after a release cycle', async ({ expect }) => {
    const { peer, db } = await setup(builder);
    for (let index = 0; index < 30; index++) {
      db.add(Obj.make(TestSchema.Task, { title: `task-${index}` }));
    }
    await db.flush();
    await peer.host.updateIndexes();

    const reopened = await reopen(peer);
    const first = await reopened.query(Query.select(Filter.type(TestSchema.Task))).run();
    expect(first).toHaveLength(30);

    // Re-running the query re-reads every object through whatever the first pass left resident, so a
    // release that stranded a load would surface here as a short result rather than an error.
    const second = await reopened.query(Query.select(Filter.type(TestSchema.Task))).run();
    expect(second).toHaveLength(30);
    expect(new Set(second.map((object) => object.id)).size).toBe(30);
  });

  test('a branch binding survives a release cycle on the same space', async ({ expect }) => {
    const { db } = await setup(builder);
    const object = db.add(Obj.make(TestSchema.Task, { title: 'main' }));
    const scratch = db.add(Obj.make(TestSchema.Task, { title: 'scratch' }));
    await db.flush();

    await db.createBranch(object.id, 'draft');
    await db.switchBranch(object.id, 'draft');
    Obj.update(db.getObjectById<any>(object.id)!, (mutable: any) => {
      mutable.title = 'drafted';
    });
    await db.flush();

    // Removing an unrelated object runs the release path while a branch is selected; a rebuilt core
    // has to come back on the branch document, not on main.
    db.remove(scratch);
    await db.flush();
    await db.runGarbageCollection();
    await db.flush();

    expect(db.getCurrentBranch(object.id)).toBe('draft');
    expect(Obj.getBranch(db.getObjectById<any>(object.id)!)).toBe('draft');
    expect(db.getObjectById<any>(object.id)?.title).toBe('drafted');
  });
});

const setup = async (builder: EchoTestBuilder): Promise<{ peer: EchoTestPeer; db: EchoDatabase }> => {
  const peer = await builder.createPeer({ types: [TestSchema.Task] });
  return { peer, db: await peer.createDatabase() };
};

/** Reopens the peer so the next read starts from disk rather than from the writer's working set. */
const reopen = async (peer: EchoTestPeer): Promise<EchoDatabase> => {
  await peer.close();
  await peer.open();
  return peer.openLastDatabase();
};
