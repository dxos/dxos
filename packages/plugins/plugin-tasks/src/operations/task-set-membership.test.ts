//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import {
  addMilestoneToSet,
  addTaskToSet,
  findMilestoneTaskSet,
  findTaskSet,
  refEntityId,
  removeTasksFromSet,
  reorder,
} from './task-set-membership';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('task set membership', () => {
  describe('reorder', () => {
    it.effect('moves an entry before its anchor', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b', 'c']);
        const refs = tasks.map((task) => Ref.make(task));

        const next = reorder(refs, tasks[2].id, tasks[0].id);

        expect(titles(next)).toEqual(['c', 'a', 'b']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('appends when the anchor is absent or unspecified', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b', 'c']);
        const refs = tasks.map((task) => Ref.make(task));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));

        expect(titles(reorder(refs, tasks[0].id, undefined))).toEqual(['b', 'c', 'a']);
        expect(titles(reorder(refs, tasks[0].id, stranger.id))).toEqual(['b', 'c', 'a']);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('leaves the array alone when the entry is absent or anchors on itself', () =>
      Effect.gen(function* () {
        const tasks = yield* seedTasks(['a', 'b']);
        const refs = tasks.map((task) => Ref.make(task));
        const stranger = yield* Database.add(Task.make({ title: 'stranger', status: 'todo' }));

        expect(titles(reorder(refs, stranger.id, tasks[0].id))).toEqual(['a', 'b']);
        expect(titles(reorder(refs, tasks[0].id, tasks[0].id))).toEqual(['a', 'b']);
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('refEntityId', () => {
    it.effect('reads the id off the URI, so an unloaded ref still compares', () =>
      Effect.gen(function* () {
        const task = yield* Database.add(Task.make({ title: 'a', status: 'todo' }));
        yield* Database.flush();

        expect(refEntityId(Ref.make(task).noInline())).toBe(task.id);
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('finding the owning set', () => {
    it.effect('a task and a milestone each resolve to the set that lists them', () =>
      Effect.gen(function* () {
        const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
        const task = yield* Database.add(Task.make({ title: 'a', status: 'todo' }));
        const milestone = yield* Database.add(Milestone.make({ name: 'Alpha' }));
        addTaskToSet(taskSet, task);
        addMilestoneToSet(taskSet, milestone);
        yield* Database.flush();

        expect((yield* findTaskSet(task))?.id).toBe(taskSet.id);
        expect((yield* findMilestoneTaskSet(milestone))?.id).toBe(taskSet.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('an unlisted task belongs to no set', () =>
      Effect.gen(function* () {
        const orphan = yield* Database.add(Task.make({ title: 'orphan', status: 'todo' }));
        yield* Database.flush();

        expect(yield* findTaskSet(orphan)).toBeUndefined();
      }).pipe(Effect.provide(testLayer())),
    );
  });

  describe('sub-trees', () => {
    it.effect('Task.subtree walks descendants and includes the root', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        const subtree = Task.subtree(yield* TaskSet.loadTasks(taskSet), root);

        expect(subtree.map((task) => task.id)).toEqual([root.id, child.id, grandchild.id]);
        expect(subtree.map((task) => task.id)).not.toContain(sibling.id);
      }).pipe(Effect.provide(testLayer())),
    );

    it.effect('removeTasksFromSet sweeps the array the cascade cannot reach', () =>
      Effect.gen(function* () {
        const { taskSet, root, child, grandchild, sibling } = yield* seedTree();

        removeTasksFromSet(taskSet, new Set([root.id, child.id, grandchild.id]));

        expect(taskSet.tasks.map((ref) => refEntityId(ref))).toEqual([sibling.id]);
      }).pipe(Effect.provide(testLayer())),
    );
  });
});

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
    addTaskToSet(taskSet, root);
    addTaskToSet(taskSet, child, root);
    addTaskToSet(taskSet, grandchild, child);
    addTaskToSet(taskSet, sibling);
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
