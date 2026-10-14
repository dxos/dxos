//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc } from '@automerge/automerge';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Obj } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

const setTitle = (task: TestSchema.Task, title: string) =>
  Obj.update(task, (task) => {
    task.title = title;
  });

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
    const accessor = getObjectCore(task).getDocAccessor(['description']);
    accessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, accessor.path.slice(), 5, 0, ' world');
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
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const task = db.add(Obj.make(TestSchema.Task, { title: 'base', description: 'base' }));
    const baseHeads = [...(Obj.version(task).automergeHeads ?? [])];
    setTitle(task, 'live');

    // A second edit branching from the base version, concurrent with the first.
    const accessor = getObjectCore(task).getDocAccessor(['description']);
    accessor.handle.changeAt(baseHeads, (doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, accessor.path.slice(), 4, 0, ' fork');
    });

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
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer({ types: [TestSchema.Task] });
    await using peer2 = await builder.createPeer({ types: [TestSchema.Task] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const task = db1.add(Obj.make(TestSchema.Task, { title: 'from peer 1' }));
    await db1.flush();

    invariant(db1.rootUrl, 'expected a root document');
    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl);
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
    await db2.flush();

    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await waitForCondition({ condition: () => task.title === 'from peer 2', timeout: 5_000 });

    const titles = Obj.getChanges(task, { property: 'title' });
    expect(titles.map(({ after }) => after)).toEqual(['from peer 1', 'from peer 2']);
    expect(new Set(titles.map(({ actor }) => actor)).size).toBe(2);
    expect(Obj.getChanges(remote, { property: 'title' }).map(({ key }) => key)).toEqual(titles.map(({ key }) => key));
  });
});
