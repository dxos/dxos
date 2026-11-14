//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';

import { type SqliteDatabase } from '../database.ts';
import { type SpaceSync } from '../sync/space-sync.ts';
import { TestBuilder } from '../testing/harness.ts';
import { EchoTestBuilder } from '../testing/index.ts';

const setTitle = (task: TestSchema.Task, title: string) =>
  Obj.update(task, (task) => {
    task.title = title;
  });

/** Flushes each database and waits for its sync round, a few times over, so announcements are acted on. */
const settle = async (...pairs: [SqliteDatabase, SpaceSync][]): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    for (const [db, sync] of pairs) {
      await db.flush();
      await sync.synced();
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('Obj.getChanges', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test("an object's history runs oldest first, from its creation to its last edit", async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const task = db.add(Obj.make(TestSchema.Task, { title: 'draft' }));
    setTitle(task, 'review');
    setTitle(task, 'done');

    const changes = Obj.getChanges(task);
    expect(changes.length).toBeGreaterThanOrEqual(3);

    const [created] = changes;
    expect(created.before).toBeUndefined();
    expect(created.after?.title).toBe('draft');
    expect(created.after?.id).toBe(task.id);

    const titles = changes.slice(-2).map(({ before, after }) => [before?.title, after?.title]);
    expect(titles).toEqual([
      ['draft', 'review'],
      ['review', 'done'],
    ]);

    for (const change of changes) {
      expect(change).toMatchObject({ source: 'document', object: task.id });
      expect(change.heads).toContain(change.key);
      expect(change.time).toBeGreaterThan(0);
      expect(change.ops).toBeGreaterThan(0);
      expect(Object.isFrozen(change)).toBe(true);
      expect(Obj.isSnapshot(change.after)).toBe(true);
    }
    expect(changes.map(({ time }) => time)).toEqual(
      changes.map(({ time }) => time).toSorted((left, right) => left - right),
    );
  });

  test('a property filter keeps only the changes that wrote it, with its values', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const task = db.add(Obj.make(TestSchema.Task, { title: 'draft' }));
    Obj.update(task, (task) => {
      task.completed = false;
    });
    setTitle(task, 'review');
    Obj.update(task, (task) => {
      task.completed = true;
    });

    const titles = Obj.getChanges(task, { property: 'title' });
    expect(titles.map(({ before, after }) => [before, after])).toEqual([
      [undefined, 'draft'],
      ['draft', 'review'],
    ]);
    expect(titles.every(({ property }) => property === 'title')).toBe(true);

    const completed = Obj.getChanges(task, { property: 'completed' });
    expect(completed.map(({ before, after }) => [before, after])).toEqual([
      [undefined, false],
      [false, true],
    ]);

    // A property that was never written has no history.
    expect(Obj.getChanges(task, { property: 'deadline' })).toEqual([]);
  });

  test("a change's heads read the object back as that change left it", async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const task = db.add(Obj.make(TestSchema.Task, { title: 'draft' }));
    setTitle(task, 'review');
    setTitle(task, 'done');

    for (const change of Obj.getChanges(task, { property: 'title' })) {
      expect(Obj.getVersion(task, change.heads).title).toBe(change.after);
    }
    expect(task.title).toBe('done');
  });

  test('text edits report the string before and after the splice', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const task = db.add(Obj.make(TestSchema.Task, { description: 'hello' }));
    await db.flush();
    // A string edit is written as a text splice of the changed characters.
    Obj.update(task, (task) => {
      task.description = 'hello world';
    });

    const last = Obj.getChanges(task, { property: 'description' }).at(-1);
    expect(last).toMatchObject({ before: 'hello', after: 'hello world' });
  });

  test('edits to another object in the same space do not enter the history', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const task = db.add(Obj.make(TestSchema.Task, { title: 'mine' }));
    const other = db.add(Obj.make(TestSchema.Task, { title: 'theirs' }));
    const before = Obj.getChanges(task).length;
    setTitle(other, 'still theirs');

    expect(Obj.getChanges(task)).toHaveLength(before);
    expect(Obj.getChanges(other).at(-1)?.after?.title).toBe('still theirs');
  });

  test('concurrent edits each report their own effect, and their merged heads read the merged value', async ({
    expect,
  }) => {
    await using network = new TestBuilder();
    const authority = network.createAuthority();
    const alice = network.createPeer({ types: [TestSchema.Task] });
    const bob = network.createPeer({ types: [TestSchema.Task] });
    const dbA = await alice.createDatabase();
    const dbB = await bob.openDatabase(dbA.spaceId);
    const syncA = alice.sync(dbA, authority);
    const syncB = bob.sync(dbB, authority);

    const task = dbA.add(Obj.make(TestSchema.Task, { title: 'base', description: 'base' }));
    await settle([dbA, syncA], [dbB, syncB]);
    const [copy] = await dbB.query(Filter.type(TestSchema.Task)).run();

    // Edits made while neither peer has the other's, so both branch from the base version.
    await syncA.close();
    setTitle(task, 'live');
    Obj.update(copy, (copy) => {
      copy.description = 'base fork';
    });
    await dbA.flush();
    await settle([dbB, syncB]);
    const resumed = alice.sync(dbA, authority);
    await settle([dbA, resumed], [dbB, syncB]);
    await waitForCondition({ condition: () => task.description === 'base fork', timeout: 5_000 });

    const [title, description] = [
      Obj.getChanges(task, { property: 'title' }).at(-1),
      Obj.getChanges(task, { property: 'description' }).at(-1),
    ];
    expect(title).toMatchObject({ before: 'base', after: 'live' });
    expect(description).toMatchObject({ before: 'base', after: 'base fork' });

    const newest = Obj.getChanges(task).at(-1);
    invariant(newest, 'expected a newest change');
    expect(newest.heads).toHaveLength(2);
    expect(Obj.getVersion(task, newest.heads)).toMatchObject({ title: 'live', description: 'base fork' });
  });

  test('changes replicated from another peer carry that peer’s actor', async ({ expect }) => {
    await using network = new TestBuilder();
    const authority = network.createAuthority();
    const peer1 = network.createPeer({ types: [TestSchema.Task] });
    const peer2 = network.createPeer({ types: [TestSchema.Task] });
    const db1 = await peer1.createDatabase();
    const db2 = await peer2.openDatabase(db1.spaceId);
    const sync1 = peer1.sync(db1, authority);
    const sync2 = peer2.sync(db2, authority);

    const task = db1.add(Obj.make(TestSchema.Task, { title: 'from peer 1' }));
    await settle([db1, sync1], [db2, sync2]);
    let remote: TestSchema.Task | undefined;
    await waitForCondition({
      condition: async () => {
        remote = (await db2.query(Filter.type(TestSchema.Task)).run()).find(({ id }) => id === task.id);
        return remote?.title === 'from peer 1';
      },
      timeout: 5_000,
    });
    invariant(remote, 'expected the task to replicate');
    setTitle(remote, 'from peer 2');
    await settle([db2, sync2], [db1, sync1]);
    await waitForCondition({ condition: () => task.title === 'from peer 2', timeout: 5_000 });

    const titles = Obj.getChanges(task, { property: 'title' });
    expect(titles.map(({ after }) => after)).toEqual(['from peer 1', 'from peer 2']);
    expect(new Set(titles.map(({ actor }) => actor)).size).toBe(2);
    expect(Obj.getChanges(remote, { property: 'title' }).map(({ key }) => key)).toEqual(titles.map(({ key }) => key));
  });
});
