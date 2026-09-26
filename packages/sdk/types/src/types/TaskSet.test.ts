//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref, Type } from '@dxos/echo';
import { createBranch, mergeBranch, switchBranch } from '@dxos/echo-client';
import { EchoTestBuilder, TestDatabaseLayer } from '@dxos/echo-client/testing';

import * as Milestone from './Milestone.ts';
import * as Task from './Task.ts';
import * as TaskSet from './TaskSet.ts';

/**
 * Membership is all a set owns: filing a task or milestone, answering which set lists one, and
 * ordering the arrays. The views derived from a task list live on `Task`, and are tested there.
 */
describe('TaskSet', () => {
  test('typename, version, and array defaults', ({ expect }) => {
    expect(Type.getTypename(TaskSet.TaskSet)).toBe('org.dxos.type.taskSet');
    expect(Type.getVersion(TaskSet.TaskSet)).toBe('0.4.0');
    const taskSet = TaskSet.make({ name: 'Work' });
    expect(taskSet.tasks).toEqual([]);
    expect(taskSet.milestones).toEqual([]);
  });

  describe('reorderInPlace', () => {
    it.effect('moves an entry before its anchor', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b', 'c']);
        const refs = tasks.map((task) => Ref.make(task));

        const next = reordered(refs, tasks[2].id, tasks[0].id);

        expect(titles(next)).toEqual(['c', 'a', 'b']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('appends when the anchor is absent or unspecified', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b', 'c']);
        const refs = tasks.map((task) => Ref.make(task));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));

        expect(titles(reordered(refs, tasks[0].id, undefined))).toEqual(['b', 'c', 'a']);
        expect(titles(reordered(refs, tasks[0].id, stranger.id))).toEqual(['b', 'c', 'a']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('leaves the array alone when the entry is absent or anchors on itself', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b']);
        const refs = tasks.map((task) => Ref.make(task));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));

        expect(titles(reordered(refs, stranger.id, tasks[0].id))).toEqual(['a', 'b']);
        expect(titles(reordered(refs, tasks[0].id, tasks[0].id))).toEqual(['a', 'b']);
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('moveTask', () => {
    it.effect('re-parents and positions in one write, so a drop lands whole', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, sibling } = yield* seedTree();

        TaskSet.moveTask(taskSet, sibling, { parentTask: root, beforeId: child.id });

        expect(titles(taskSet.tasks)).toEqual(['root']);
        expect(titles(root.subtasks ?? [])).toEqual(['sibling', 'child']);
        expect(Task.parentTaskId(sibling)).toBe(root.id);
        expect(Obj.getParent(sibling)?.id).toBe(root.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('reorders within a parent without touching the parent edge', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, sibling } = yield* seedTree();
        TaskSet.moveTask(taskSet, sibling, { parentTask: root });
        expect(titles(root.subtasks ?? [])).toEqual(['child', 'sibling']);

        TaskSet.moveTask(taskSet, sibling, { beforeId: child.id });

        expect(titles(root.subtasks ?? [])).toEqual(['sibling', 'child']);
        expect(Task.parentTaskId(sibling)).toBe(root.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('moves a sub-task between parents, carrying its own subtree', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        TaskSet.moveTask(taskSet, child, { parentTask: sibling });

        expect(titles(root.subtasks ?? [])).toEqual([]);
        expect(titles(sibling.subtasks ?? [])).toEqual(['child']);
        expect(Task.parentTaskId(child)).toBe(sibling.id);
        expect(Task.parentTaskId(grandchild)).toBe(child.id);
        expect(TaskSet.resolveTasks(taskSet).map((task) => task.title)).toEqual([
          'root',
          'sibling',
          'child',
          'grandchild',
        ]);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('promotes to a root on a null parent and demotes back', () =>
      Effect.gen(function* () {
        const { taskSet, root, child } = yield* seedTree();

        TaskSet.moveTask(taskSet, child, { parentTask: null, beforeId: root.id });
        expect(titles(taskSet.tasks)).toEqual(['child', 'root', 'sibling']);
        expect(root.subtasks ?? []).toHaveLength(0);
        expect(Obj.getParent(child)?.id).toBe(taskSet.id);
        expect(Task.getParentTask(child)).toBeUndefined();

        TaskSet.moveTask(taskSet, child, { parentTask: root });
        expect(titles(taskSet.tasks)).toEqual(['root', 'sibling']);
        expect(titles(root.subtasks ?? [])).toEqual(['child']);
        expect(Task.parentTaskId(child)).toBe(root.id);
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('deleteTask', () => {
    it.effect('takes the subtree with it along the parent edge', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        TaskSet.deleteTask(db, taskSet, child);
        yield* Database.flush();

        expect(root.subtasks ?? []).toHaveLength(0);
        expect(Obj.isDeleted(child)).toBe(true);
        expect(Obj.isDeleted(grandchild)).toBe(true);
        expect(TaskSet.resolveTasks(taskSet).map((task) => task.id)).toEqual([root.id, sibling.id]);
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('finding the owning set', () => {
    it.effect('a task and a milestone each resolve to the set that lists them', () =>
      Effect.gen(function* () {
        const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
        const task = yield* Database.add(Task.make({ title: 'a', status: 'todo' }));
        const milestone = yield* Database.add(Milestone.make({ name: 'Alpha' }));
        TaskSet.addTaskToSet(taskSet, task);
        TaskSet.addMilestoneToSet(taskSet, milestone);
        yield* Database.flush();

        expect((yield* TaskSet.findTaskSet(task))?.id).toBe(taskSet.id);
        expect((yield* TaskSet.findMilestoneTaskSet(milestone))?.id).toBe(taskSet.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('an unlisted task belongs to no set', () =>
      Effect.gen(function* () {
        const orphan = yield* Database.add(Task.make({ title: 'orphan', status: 'todo' }));
        yield* Database.flush();

        expect(yield* TaskSet.findTaskSet(orphan)).toBeUndefined();
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('membership', () => {
    it.effect('a sub-task resolves to the set holding the root of its tree', () =>
      Effect.gen(function* () {
        const { taskSet, grandchild } = yield* seedTree();

        expect((yield* TaskSet.findTaskSet(grandchild))?.id).toBe(taskSet.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('a member listed only by its parent edge is re-listed rather than refused', () =>
      Effect.gen(function* () {
        const { taskSet, root, sibling } = yield* seedTree();
        const dropped = yield* Database.add(Task.make({ [Obj.Parent]: taskSet, title: 'dropped', status: 'todo' }));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));
        yield* Database.flush();

        const parent = yield* TaskSet.resolveParentTask(taskSet, sibling, Ref.make(dropped));

        expect(parent.id).toBe(dropped.id);
        expect(taskSet.tasks.map((ref) => Task.refEntityId(ref))).toContain(dropped.id);
        expect((yield* TaskSet.findTaskSet(dropped))?.id).toBe(taskSet.id);

        const error = yield* TaskSet.resolveParentTask(taskSet, root, Ref.make(stranger)).pipe(Effect.flip);
        expect(error).toBeInstanceOf(TaskSet.InvalidParentTaskError);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect("a sub-task dropped from its parent's list is re-listed there, not in the set", () =>
      Effect.gen(function* () {
        const { taskSet, child } = yield* seedTree();
        const dropped = yield* Database.add(Task.make({ [Obj.Parent]: child, title: 'dropped', status: 'todo' }));
        yield* Database.flush();

        expect(TaskSet.ensureMember(taskSet, dropped)).toBe(true);

        expect(titles(child.subtasks ?? [])).toEqual(['grandchild', 'dropped']);
        expect(titles(taskSet.tasks)).toEqual(['root', 'sibling']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('a re-parent under its own subtree is refused', () =>
      Effect.gen(function* () {
        const { taskSet, root, grandchild } = yield* seedTree();

        const error = yield* TaskSet.resolveParentTask(taskSet, root, Ref.make(grandchild)).pipe(Effect.flip);

        expect(error).toBeInstanceOf(TaskSet.InvalidParentTaskError);
      }).pipe(Effect.provide(testLayer())),
    );
  });
});

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

const seedTasks = (titles: readonly string[]) =>
  Effect.gen(function* () {
    const tasks = [];
    for (const title of titles) {
      tasks.push(yield* Database.add(Task.make({ title, status: 'todo' })));
    }
    yield* Database.flush();
    return tasks;
  });

/** `root` → `child` → `grandchild`, beside a second root `sibling`. */
const seedTree = () =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
    const root = TaskSet.addTask(db, taskSet, 'root');
    const child = TaskSet.addTask(db, taskSet, 'child', {}, { parent: root });
    const grandchild = TaskSet.addTask(db, taskSet, 'grandchild', {}, { parent: child });
    const sibling = TaskSet.addTask(db, taskSet, 'sibling');
    yield* Database.flush();
    return { taskSet, root, child, grandchild, sibling };
  });

/** `reorderInPlace` on a copy, so each assertion starts from the same order. */
const reordered = (
  refs: ReadonlyArray<Ref.Ref<Task.Task>>,
  id: string,
  beforeId: string | undefined,
): Ref.Ref<Task.Task>[] => {
  const copy = [...refs];
  TaskSet.reorderInPlace(copy, id, beforeId);
  return copy;
};

const titles = (refs: ReadonlyArray<Ref.Ref<Task.Task>>): (string | undefined)[] =>
  refs.map((ref) => ref.target?.title);

/**
 * A reorder merged against a concurrent push must keep the pushed entry. The push is made on a
 * branch forked before the reorder and merged back, which is exactly what a peer that had not yet
 * seen the reorder produces; the whole-array write is the control showing the scenario can lose it.
 */
describe('TaskSet concurrent membership', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const mergeConcurrentPush = async (reorder: (taskSet: TaskSet.TaskSet, first: Task.Task) => void) => {
    const { db } = await builder.createDatabase({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });
    const taskSet = db.add(TaskSet.make({ name: 'Sprint' }));
    const first = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'first', status: 'todo' }));
    const second = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'second', status: 'todo' }));
    const pushed = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'pushed', status: 'todo' }));
    TaskSet.addTaskToSet(taskSet, first);
    TaskSet.addTaskToSet(taskSet, second);
    await db.flush();

    await createBranch(taskSet, 'peer');
    await switchBranch(taskSet, 'peer');
    TaskSet.addTaskToSet(taskSet, pushed);
    await db.flush();
    await switchBranch(taskSet, 'main');

    reorder(taskSet, first);
    await db.flush();
    await mergeBranch(taskSet, 'peer');
    await db.flush();

    return { ids: taskSet.tasks.map((ref) => Task.refEntityId(ref)), first, second, pushed };
  };

  test('a reorder keeps an entry a concurrent peer pushed', async () => {
    const { ids, first, second, pushed } = await mergeConcurrentPush((taskSet, first) =>
      TaskSet.moveTask(taskSet, first, {}),
    );
    expect([...ids].sort()).toEqual([first.id, second.id, pushed.id].sort());
  });

  test('a sub-task reorder keeps a sub-task a concurrent peer added', async () => {
    const { db } = await builder.createDatabase({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });
    const taskSet = db.add(TaskSet.make({ name: 'Sprint' }));
    const parent = TaskSet.addTask(db, taskSet, 'parent');
    const first = TaskSet.addTask(db, taskSet, 'first', {}, { parent });
    const second = TaskSet.addTask(db, taskSet, 'second', {}, { parent });
    await db.flush();

    await createBranch(parent, 'peer');
    await switchBranch(parent, 'peer');
    const pushed = TaskSet.addTask(db, taskSet, 'pushed', {}, { parent });
    await db.flush();
    await switchBranch(parent, 'main');

    TaskSet.moveTask(taskSet, first, {});
    await db.flush();
    await mergeBranch(parent, 'peer');
    await db.flush();

    const ids = (parent.subtasks ?? []).map((ref) => Task.refEntityId(ref));
    expect([...ids].sort()).toEqual([first.id, second.id, pushed.id].sort());
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  test('two peers re-listing the same dropped task converge on one entry', async () => {
    const { db } = await builder.createDatabase({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });
    const taskSet = db.add(TaskSet.make({ name: 'Sprint' }));
    const listed = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'listed', status: 'todo' }));
    // In the set by its parent edge only, as a dropped entry leaves it.
    const dropped = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'dropped', status: 'todo' }));
    TaskSet.addTaskToSet(taskSet, listed);
    await db.flush();

    await createBranch(taskSet, 'peer');
    await switchBranch(taskSet, 'peer');
    expect(TaskSet.ensureMember(taskSet, dropped)).toBe(true);
    await db.flush();
    await switchBranch(taskSet, 'main');
    expect(TaskSet.ensureMember(taskSet, dropped)).toBe(true);
    await db.flush();
    await mergeBranch(taskSet, 'peer');
    await db.flush();

    const count = () => taskSet.tasks.filter((ref) => Task.refEntityId(ref) === dropped.id).length;
    expect(count()).toBeGreaterThanOrEqual(1);
    expect(TaskSet.ensureMember(taskSet, dropped)).toBe(true);
    expect(count()).toBe(1);
    expect(TaskSet.resolveTasks(taskSet).map((task) => task.id)).toEqual([listed.id, dropped.id]);
  });

  test('a reorder collapses duplicate entries of the task it moves', async () => {
    const { db } = await builder.createDatabase({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });
    const taskSet = db.add(TaskSet.make({ name: 'Sprint' }));
    const first = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'first', status: 'todo' }));
    const second = db.add(Task.make({ [Obj.Parent]: taskSet, title: 'second', status: 'todo' }));
    TaskSet.addTaskToSet(taskSet, first);
    TaskSet.addTaskToSet(taskSet, second);
    TaskSet.addTaskToSet(taskSet, first);
    await db.flush();

    TaskSet.moveTask(taskSet, first, {});

    expect(taskSet.tasks.map((ref) => Task.refEntityId(ref))).toEqual([second.id, first.id]);
  });

  test('control: a whole-array write drops it', async () => {
    const { ids, pushed } = await mergeConcurrentPush((taskSet) =>
      Obj.update(taskSet, (taskSet) => {
        taskSet.tasks = [...taskSet.tasks].reverse();
      }),
    );
    expect(ids).not.toContain(pushed.id);
  });
});
