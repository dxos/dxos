//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

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
    expect(Type.getVersion(TaskSet.TaskSet)).toBe('0.3.0');
    const taskSet = TaskSet.make({ name: 'Work' });
    expect(taskSet.tasks).toEqual([]);
    expect(taskSet.milestones).toEqual([]);
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

  describe('moveTask', () => {
    it.effect('repositions and re-parents in one write, so a drop lands whole', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, sibling } = yield* seedTree();

        TaskSet.moveTask(taskSet, sibling, { parentTask: root, beforeId: child.id });

        expect(titles(taskSet.tasks)).toEqual(['root', 'sibling', 'child', 'grandchild']);
        expect(Task.parentTaskId(sibling)).toBe(root.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('promotes to a root on a null parent, and leaves the hierarchy alone when omitted', () =>
      Effect.gen(function* () {
        const { taskSet, child, grandchild } = yield* seedTree();

        TaskSet.moveTask(taskSet, child, { parentTask: null });
        expect(child.parentTask).toBeUndefined();

        TaskSet.moveTask(taskSet, grandchild, { beforeId: child.id });
        expect(Task.parentTaskId(grandchild)).toBe(child.id);
        expect(titles(taskSet.tasks)).toEqual(['root', 'sibling', 'grandchild', 'child']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('re-parents the last task, where the array order is already what the move asks for', () =>
      Effect.gen(function* () {
        const { taskSet, root, sibling } = yield* seedTree();

        TaskSet.moveTask(taskSet, sibling, { parentTask: root });

        expect(titles(taskSet.tasks)).toEqual(['root', 'child', 'grandchild', 'sibling']);
        expect(Task.parentTaskId(sibling)).toBe(root.id);
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
    it.effect('a sub-task filed in another set is still part of the walk', () =>
      Effect.gen(function* () {
        const { root } = yield* seedTree();
        const other = yield* Database.add(TaskSet.make({ name: 'Elsewhere' }));
        const stray = yield* Database.add(Task.make({ title: 'stray', status: 'todo', parentTask: Ref.make(root) }));
        TaskSet.addTaskToSet(other, stray);
        yield* Database.flush();

        const subtree = yield* Task.collectSubtree(root);

        expect(subtree.map((task) => task.id)).toContain(stray.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('removeTasksFromSet sweeps the array the cascade cannot reach', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        TaskSet.removeTasksFromSet(taskSet, new Set([root.id, child.id, grandchild.id]));

        expect(taskSet.tasks.map((ref) => Task.refEntityId(ref))).toEqual([sibling.id]);
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
