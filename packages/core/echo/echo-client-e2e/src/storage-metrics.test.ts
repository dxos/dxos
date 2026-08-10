//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

// Storage metrics (`db.stats()`) and garbage collection (`db.runGarbageCollection()`).
// See `docs/GARBAGE_COLLECTION.md` in `@dxos/echo-host`.
describe('storage metrics & garbage collection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('stats on an empty space', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    const stats = await db.stats();
    expect(stats.objects).toEqual({ alive: 0, deleted: 0 });
    // Only the root document exists.
    expect(stats.documents).toEqual(1);
    expect(stats.feeds).toEqual(0);
    expect(stats.feedBlocks).toEqual(0);
  });

  test('stats counts alive and deleted objects and their documents', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    const objects = [1, 2, 3].map((value) => db.add(Obj.make(TestSchema.Expando, { value })));
    await db.flush();

    {
      const stats = await db.stats();
      expect(stats.objects).toEqual({ alive: 3, deleted: 0 });
      // Root document + one linked document per object.
      expect(stats.documents).toEqual(4);
    }

    db.remove(objects[1]);
    await db.flush();

    {
      const stats = await db.stats();
      // Deletion is soft — the object and its document are still present until GC.
      expect(stats.objects).toEqual({ alive: 2, deleted: 1 });
      expect(stats.documents).toEqual(4);
    }
  });

  test('stats counts feeds and feed blocks', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    const feed = db.add(Feed.make({ name: 'people' }));
    await db.appendToFeed(feed, [
      Obj.make(TestSchema.Person, { name: 'alice' }),
      Obj.make(TestSchema.Person, { name: 'bob' }),
    ]);
    await db.flush();

    const stats = await db.stats();
    expect(stats.feeds).toEqual(1);
    expect(stats.feedBlocks).toEqual(2);
  });

  test('garbage collection unlinks deleted objects, wipes documents and clears index entries', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    const objects = [1, 2, 3].map((value) => db.add(Obj.make(TestSchema.Expando, { value })));
    await db.flush();
    // Index the objects so there are index rows for GC to reclaim.
    await peer.host.updateIndexes();

    db.remove(objects[1]);
    db.remove(objects[2]);
    await db.flush();

    const report = await db.runGarbageCollection();
    expect(report.unlinkedObjects).toEqual(2);
    expect(report.removedDocuments).toEqual(2);
    expect(report.removedIndexEntries).toEqual(2);

    const stats = await db.stats();
    expect(stats.objects).toEqual({ alive: 1, deleted: 0 });
    // Root document + the single surviving object's document.
    expect(stats.documents).toEqual(2);

    // The surviving object is still queryable; the reclaimed ones are gone.
    const results = await db.query(Filter.type(TestSchema.Expando)).run();
    expect(results.map((object) => object.value)).toEqual([1]);
  });

  test('garbage collection is idempotent and survives reopen', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    const objects = [1, 2].map((value) => db.add(Obj.make(TestSchema.Expando, { value })));
    await db.flush();
    db.remove(objects[0]);
    await db.flush();

    const first = await db.runGarbageCollection();
    expect(first.removedDocuments).toEqual(1);

    // A second pass reclaims nothing.
    const second = await db.runGarbageCollection();
    expect(second).toEqual({ unlinkedObjects: 0, removedDocuments: 0, removedIndexEntries: 0, purgedFeedBlocks: 0 });

    await db.flush();
    await peer.host.updateIndexes();
    await peer.close();
    await peer.open();

    const db2 = await peer.openLastDatabase();
    const stats = await db2.stats();
    expect(stats.objects).toEqual({ alive: 1, deleted: 0 });
    expect(stats.documents).toEqual(2);
  });

  // Deletion cascades are computed at read time, never written: a child of a deleted parent has no
  // `deleted` flag of its own yet queries as deleted. Collection has to apply the same rule, or
  // such objects stay on disk forever while being invisible to every query.
  test('collects objects that are only transitively deleted', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db = await peer.createDatabase();

    const parent = db.add(Obj.make(TestSchema.Expando, { name: 'parent' }));
    const child = db.add(Obj.make(TestSchema.Expando, { name: 'child' }));
    Obj.setParent(child, parent);
    await db.flush();

    const before = await db.stats();
    db.remove(parent);
    await db.flush();

    // The child is deleted by cascade, without a flag of its own.
    expect(await db.query(Query.select(Filter.everything())).run()).toHaveLength(0);

    const report = await db.runGarbageCollection();
    expect(report.unlinkedObjects).toBeGreaterThanOrEqual(2);

    const after = await db.stats();
    expect(after.objects).toEqual({ alive: 0, deleted: 0 });
    expect(after.documents).toBeLessThan(before.documents);
  });
});
