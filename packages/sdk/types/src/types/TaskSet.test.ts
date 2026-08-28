//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

import * as Milestone from './Milestone';
import * as Task from './Task';
import * as TaskSet from './TaskSet';

/**
 * The derived views are the whole point of the flat-array model — hierarchy, milestone grouping,
 * and progress are computed, never stored, so these assert the two can never disagree. The
 * database-backed suites below them cover membership: filing, finding the owning set, and the
 * loaded subtree walks.
 */
describe('TaskSet', () => {
  it('typename, version, and array defaults', ({ expect }) => {
    expect(Type.getTypename(TaskSet.TaskSet)).toBe('org.dxos.type.taskSet');
    expect(Type.getVersion(TaskSet.TaskSet)).toBe('0.3.0');
    const taskSet = TaskSet.make({ name: 'Work' });
    expect(taskSet.tasks).toEqual([]);
    expect(taskSet.milestones).toEqual([]);
  });

  it('roots and sub-tasks partition the flat array', ({ expect }) => {
    const parent = Task.make({ title: 'Parent' });
    const child = Task.make({ title: 'Child', parentTask: Ref.make(parent) });
    const grandchild = Task.make({ title: 'Grandchild', parentTask: Ref.make(child) });
    const tasks = [parent, child, grandchild];

    expect(TaskSet.rootTasks(tasks).map((task) => task.title)).toEqual(['Parent']);
    expect(TaskSet.subTasks(tasks, parent).map((task) => task.title)).toEqual(['Child']);
    expect(TaskSet.subTasks(tasks, child).map((task) => task.title)).toEqual(['Grandchild']);
  });

  it('a task whose parent is absent reads as a root rather than vanishing', ({ expect }) => {
    const absent = Task.make({ title: 'Absent' });
    const orphan = Task.make({ title: 'Orphan', parentTask: Ref.make(absent) });

    expect(TaskSet.rootTasks([orphan]).map((task) => task.title)).toEqual(['Orphan']);
  });

  it('sub-tasks inherit the nearest ancestor milestone, and an own milestone overrides', ({ expect }) => {
    const first = Milestone.make({ name: 'First' });
    const second = Milestone.make({ name: 'Second' });
    const parent = Task.make({ title: 'Parent', milestone: Ref.make(first) });
    const inherits = Task.make({ title: 'Inherits', parentTask: Ref.make(parent) });
    const overrides = Task.make({ title: 'Overrides', parentTask: Ref.make(parent), milestone: Ref.make(second) });
    const deep = Task.make({ title: 'Deep', parentTask: Ref.make(inherits) });
    const backlog = Task.make({ title: 'Backlog' });
    const tasks = [parent, inherits, overrides, deep, backlog];

    expect(TaskSet.tasksForMilestone(tasks, first).map((task) => task.title)).toEqual(['Parent', 'Inherits', 'Deep']);
    expect(TaskSet.tasksForMilestone(tasks, second).map((task) => task.title)).toEqual(['Overrides']);
    expect(TaskSet.backlogTasks(tasks).map((task) => task.title)).toEqual(['Backlog']);
  });

  it('a parentTask cycle terminates instead of hanging', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second', parentTask: Ref.make(first) });
    Obj.update(first, (first) => {
      first.parentTask = Ref.make(second);
    });

    expect(TaskSet.backlogTasks([first, second]).map((task) => task.title)).toEqual(['First', 'Second']);
  });

  it('progress counts done over non-cancelled, so a milestone cannot disagree with its tasks', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Ship' });
    const tasks = [
      Task.make({ title: 'a', status: 'done', milestone: Ref.make(milestone) }),
      Task.make({ title: 'b', status: 'todo', milestone: Ref.make(milestone) }),
      Task.make({ title: 'c', status: 'cancelled', milestone: Ref.make(milestone) }),
    ];

    expect(TaskSet.milestoneProgress(tasks, milestone)).toEqual({ total: 2, done: 1, ratio: 0.5 });
  });

  it('an empty milestone reports zero rather than complete', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Empty' });

    expect(TaskSet.milestoneProgress([], milestone)).toEqual({ total: 0, done: 0, ratio: 0 });
  });

  it('orderTasks follows the array, appending tasks the array does not list', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second' });
    const unlisted = Task.make({ title: 'Unlisted' });
    const refs = [Ref.make(second), Ref.make(first)];

    const ordered = TaskSet.orderTasks([first, unlisted, second], refs);
    expect(ordered.map((task) => task.title)).toEqual(['Second', 'First', 'Unlisted']);
  });

  it('orderTasks keeps the first array position for a duplicated ref', ({ expect }) => {
    const task = Task.make({ title: 'Task' });
    const other = Task.make({ title: 'Other' });
    const refs = [Ref.make(task), Ref.make(other), Ref.make(task)];

    const ordered = TaskSet.orderTasks([other, task], refs);
    expect(ordered.map((entry) => entry.title)).toEqual(['Task', 'Other']);
  });

  describe('reorder', () => {
    it.effect('moves an entry before its anchor', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b', 'c']);
        const refs = tasks.map((task) => Ref.make(task));

        const next = TaskSet.reorder(refs, tasks[2].id, tasks[0].id);

        expect(titles(next)).toEqual(['c', 'a', 'b']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('appends when the anchor is absent or unspecified', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b', 'c']);
        const refs = tasks.map((task) => Ref.make(task));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));

        expect(titles(TaskSet.reorder(refs, tasks[0].id, undefined))).toEqual(['b', 'c', 'a']);
        expect(titles(TaskSet.reorder(refs, tasks[0].id, stranger.id))).toEqual(['b', 'c', 'a']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('leaves the array alone when the entry is absent or anchors on itself', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b']);
        const refs = tasks.map((task) => Ref.make(task));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));

        expect(titles(TaskSet.reorder(refs, stranger.id, tasks[0].id))).toEqual(['a', 'b']);
        expect(titles(TaskSet.reorder(refs, tasks[0].id, tasks[0].id))).toEqual(['a', 'b']);
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('refEntityId', () => {
    it.effect('reads the id off the URI, so an unloaded ref still compares', () =>
      Effect.gen(function* () {
        const task = yield* Database.add(Task.make({ title: 'a', status: 'todo' }));
        yield* Database.flush();

        expect(TaskSet.refEntityId(Ref.make(task).noInline())).toBe(task.id);
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

  describe('sub-trees', () => {
    it.effect('collectSubtree walks descendants and includes the root', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        const subtree = TaskSet.collectSubtree(yield* TaskSet.loadSetTasks(taskSet), root);

        expect(subtree.map((task) => task.id)).toEqual([root.id, child.id, grandchild.id]);
        expect(subtree.map((task) => task.id)).not.toContain(sibling.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('removeTasksFromSet sweeps the array the cascade cannot reach', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        TaskSet.removeTasksFromSet(taskSet, new Set([root.id, child.id, grandchild.id]));

        expect(taskSet.tasks.map((ref) => TaskSet.refEntityId(ref))).toEqual([sibling.id]);
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

const seedTree = () =>
  Effect.gen(function* () {
    const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
    const root = yield* Database.add(Task.make({ title: 'root', status: 'todo' }));
    const child = yield* Database.add(Task.make({ title: 'child', status: 'todo' }));
    const grandchild = yield* Database.add(Task.make({ title: 'grandchild', status: 'todo' }));
    const sibling = yield* Database.add(Task.make({ title: 'sibling', status: 'todo' }));
    TaskSet.addTaskToSet(taskSet, root);
    TaskSet.addTaskToSet(taskSet, child);
    TaskSet.addTaskToSet(taskSet, grandchild);
    TaskSet.addTaskToSet(taskSet, sibling);
    Obj.update(child, (child) => {
      child.parentTask = Ref.make(root);
    });
    Obj.update(grandchild, (grandchild) => {
      grandchild.parentTask = Ref.make(child);
    });
    yield* Database.flush();
    return { taskSet, root, child, grandchild, sibling };
  });

const titles = (refs: ReadonlyArray<Ref.Ref<Task.Task>>): (string | undefined)[] =>
  refs.map((ref) => ref.target?.title);
