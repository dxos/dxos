//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import * as Milestone from './Milestone.ts';
import * as Task from './Task.ts';
import * as TaskMigration from './TaskMigration.ts';
import * as TaskSet from './TaskSet.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const setup = async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([
    Milestone.Milestone,
    TaskMigration.LegacyTask,
    TaskMigration.LegacyTaskSet,
    Task.Task,
    TaskSet.TaskSet,
  ]);
  return db;
};

type LegacyDraft = { title: string; parent?: string; status?: Task.Status };

/**
 * A set as stored before the move: every task in the flat list, the set as each one's ECHO parent,
 * and the hierarchy as `parentTask` refs.
 */
const seedLegacy = async (db: Awaited<ReturnType<typeof setup>>, drafts: readonly LegacyDraft[]) => {
  const set = db.add(Obj.make(TaskMigration.LegacyTaskSet, { name: 'Sprint', tasks: [], milestones: [] }));
  const byTitle = new Map<string, TaskMigration.LegacyTask>();
  for (const { title, parent, status } of drafts) {
    const parentTask = parent === undefined ? undefined : byTitle.get(parent);
    const task = db.add(
      Obj.make(TaskMigration.LegacyTask, {
        [Obj.Parent]: set,
        title,
        ...(status ? { status } : {}),
        ...(parentTask ? { parentTask: Ref.make(parentTask) } : {}),
      }),
    );
    byTitle.set(title, task);
  }
  Obj.update(set, (set) => {
    set.tasks.push(...[...byTitle.values()].map((task) => Ref.make(task)));
  });
  await db.flush();
  return { setId: set.id, ids: new Map([...byTitle].map(([title, task]) => [title, task.id])) };
};

const load = async (db: Awaited<ReturnType<typeof setup>>) => {
  const [taskSet] = await db.query(Filter.type(TaskSet.TaskSet)).run();
  const tasks = await db.query(Filter.type(Task.Task)).run();
  const byTitle = new Map(tasks.map((task) => [task.title, task]));
  const get = (title: string): Task.Task => {
    const task = byTitle.get(title);
    if (!task) {
      throw new Error(`missing ${title}`);
    }
    return task;
  };
  const titles = (refs: ReadonlyArray<Ref.Ref<Task.Task>>) =>
    refs.map((ref) => tasks.find((task) => task.id === Task.refEntityId(ref))?.title);
  return { taskSet, tasks, get, titles };
};

describe('task hierarchy migration', () => {
  test('moves sub-tasks out of the flat list into their parents, in flat-list order', async ({ expect }) => {
    const db = await setup();
    const { setId, ids } = await seedLegacy(db, [
      { title: 'epic' },
      { title: 'loose' },
      { title: 'step two', parent: 'epic' },
      { title: 'detail', parent: 'step two', status: 'done' },
      { title: 'step one', parent: 'epic' },
    ]);

    await db.runMigrations(TaskMigration.migrations);

    expect(await db.query(Filter.type(TaskMigration.LegacyTask)).run()).toHaveLength(0);
    expect(await db.query(Filter.type(TaskMigration.LegacyTaskSet)).run()).toHaveLength(0);
    const { taskSet, get, titles } = await load(db);
    expect(taskSet.id).toBe(setId);
    expect(get('epic').id).toBe(ids.get('epic'));

    expect(titles(taskSet.tasks)).toEqual(['epic', 'loose']);
    expect(titles(get('epic').subtasks ?? [])).toEqual(['step two', 'step one']);
    expect(titles(get('step two').subtasks ?? [])).toEqual(['detail']);
    expect(get('loose').subtasks).toEqual([]);
    expect(get('detail').status).toBe('done');

    expect(Obj.getParent(get('epic'))?.id).toBe(setId);
    expect(Task.parentTaskId(get('step two'))).toBe(get('epic').id);
    expect(Task.parentTaskId(get('detail'))).toBe(get('step two').id);
    expect(TaskSet.resolveTasks(taskSet).map((task) => task.title)).toEqual([
      'epic',
      'step two',
      'detail',
      'step one',
      'loose',
    ]);
  });

  test('keeps a dangling or cyclic parent as a root rather than losing the task', async ({ expect }) => {
    const db = await setup();
    await seedLegacy(db, [
      { title: 'a' },
      { title: 'b', parent: 'a' },
      { title: 'gone' },
      { title: 'c', parent: 'gone' },
    ]);
    const [a] = (await db.query(Filter.type(TaskMigration.LegacyTask)).run()).filter((task) => task.title === 'a');
    const [b] = (await db.query(Filter.type(TaskMigration.LegacyTask)).run()).filter((task) => task.title === 'b');
    const [gone] = (await db.query(Filter.type(TaskMigration.LegacyTask)).run()).filter(
      (task) => task.title === 'gone',
    );
    Obj.update(a, (a) => {
      a.parentTask = Ref.make(b);
    });
    const [set] = await db.query(Filter.type(TaskMigration.LegacyTaskSet)).run();
    Obj.update(set, (set) => {
      TaskSet.removeRefsInPlace(set.tasks, new Set([gone.id]));
    });
    db.remove(gone);
    await db.flush();

    await db.runMigrations(TaskMigration.migrations);

    const { taskSet, get, titles } = await load(db);
    // `a` is listed first, so its link survives and `b`'s closes the cycle and is dropped.
    expect(titles(taskSet.tasks)).toEqual(['b', 'c']);
    expect(titles(get('b').subtasks ?? [])).toEqual(['a']);
    expect(Obj.getParent(get('c'))?.id).toBe(taskSet.id);
  });

  test('is idempotent', async ({ expect }) => {
    const db = await setup();
    await seedLegacy(db, [{ title: 'epic' }, { title: 'step', parent: 'epic' }]);

    await db.runMigrations(TaskMigration.migrations);
    await db.runMigrations(TaskMigration.migrations);

    const { taskSet, get, titles } = await load(db);
    expect(titles(taskSet.tasks)).toEqual(['epic']);
    expect(titles(get('epic').subtasks ?? [])).toEqual(['step']);
  });
});
