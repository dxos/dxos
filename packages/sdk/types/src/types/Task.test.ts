//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

import * as Milestone from './Milestone';
import * as Task from './Task';

/**
 * The derived views are the whole point of the flat-array model — hierarchy, milestone grouping,
 * and progress are computed, never stored, so these assert the two can never disagree. They act on
 * a plain task list, which is why they live here rather than on a container.
 */
describe('Task derived views', () => {
  it('roots and sub-tasks partition the flat array', ({ expect }) => {
    const parent = Task.make({ title: 'Parent' });
    const child = Task.make({ title: 'Child', parentTask: Ref.make(parent) });
    const grandchild = Task.make({ title: 'Grandchild', parentTask: Ref.make(child) });
    const tasks = [parent, child, grandchild];

    expect(Task.rootTasks(tasks).map((task) => task.title)).toEqual(['Parent']);
    expect(Task.subTasks(tasks, parent).map((task) => task.title)).toEqual(['Child']);
    expect(Task.subTasks(tasks, child).map((task) => task.title)).toEqual(['Grandchild']);
  });

  it('a task whose parent is absent reads as a root rather than vanishing', ({ expect }) => {
    const absent = Task.make({ title: 'Absent' });
    const orphan = Task.make({ title: 'Orphan', parentTask: Ref.make(absent) });

    expect(Task.rootTasks([orphan]).map((task) => task.title)).toEqual(['Orphan']);
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

    expect(Task.tasksForMilestone(tasks, first).map((task) => task.title)).toEqual(['Parent', 'Inherits', 'Deep']);
    expect(Task.tasksForMilestone(tasks, second).map((task) => task.title)).toEqual(['Overrides']);
    expect(Task.backlogTasks(tasks).map((task) => task.title)).toEqual(['Backlog']);
  });

  it('a parentTask cycle terminates instead of hanging', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second', parentTask: Ref.make(first) });
    Obj.update(first, (first) => {
      first.parentTask = Ref.make(second);
    });

    expect(Task.backlogTasks([first, second]).map((task) => task.title)).toEqual(['First', 'Second']);
  });

  it('progress counts done over non-cancelled, so a milestone cannot disagree with its tasks', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Ship' });
    const tasks = [
      Task.make({ title: 'a', status: 'done', milestone: Ref.make(milestone) }),
      Task.make({ title: 'b', status: 'todo', milestone: Ref.make(milestone) }),
      Task.make({ title: 'c', status: 'cancelled', milestone: Ref.make(milestone) }),
    ];

    expect(Task.milestoneProgress(tasks, milestone)).toEqual({ total: 2, done: 1, ratio: 0.5 });
  });

  it('an empty milestone reports zero rather than complete', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Empty' });

    expect(Task.milestoneProgress([], milestone)).toEqual({ total: 0, done: 0, ratio: 0 });
  });

  it('orderTasks follows the array, appending tasks the array does not list', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second' });
    const unlisted = Task.make({ title: 'Unlisted' });
    const refs = [Ref.make(second), Ref.make(first)];

    const ordered = Task.orderTasks([first, unlisted, second], refs);
    expect(ordered.map((task) => task.title)).toEqual(['Second', 'First', 'Unlisted']);
  });

  it('orderTasks keeps the first array position for a duplicated ref', ({ expect }) => {
    const task = Task.make({ title: 'Task' });
    const other = Task.make({ title: 'Other' });
    const refs = [Ref.make(task), Ref.make(other), Ref.make(task)];

    const ordered = Task.orderTasks([other, task], refs);
    expect(ordered.map((entry) => entry.title)).toEqual(['Task', 'Other']);
  });

  it('subtree walks descendants within the list, and stops at what the list holds', ({ expect }) => {
    const root = Task.make({ title: 'Root' });
    const child = Task.make({ title: 'Child', parentTask: Ref.make(root) });
    const grandchild = Task.make({ title: 'Grandchild', parentTask: Ref.make(child) });
    const sibling = Task.make({ title: 'Sibling' });

    expect(Task.subtree([root, child, grandchild, sibling], root).map((task) => task.title)).toEqual([
      'Root',
      'Child',
      'Grandchild',
    ]);
    expect(Task.subtree([root, grandchild], root).map((task) => task.title)).toEqual(['Root']);
  });
});

describe('refEntityId', () => {
  it.effect('reads the id off the URI, so an unloaded ref still compares', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'a', status: 'todo' }));
      yield* Database.flush();

      expect(Task.refEntityId(Ref.make(task).noInline())).toBe(task.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('collectSubtree', () => {
  it.effect('walks descendants and includes the root', () =>
    Effect.gen(function* () {
      const { root, child, grandchild, sibling } = yield* seedTree();

      const subtree = yield* Task.collectSubtree(root);

      expect(subtree.map((task) => task.id)).toEqual([root.id, child.id, grandchild.id]);
      expect(subtree.map((task) => task.id)).not.toContain(sibling.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('reaches a sub-task no list holds, since the walk goes through the reverse-ref index', () =>
    Effect.gen(function* () {
      const { root } = yield* seedTree();
      const stray = yield* Database.add(Task.make({ title: 'stray', status: 'todo', parentTask: Ref.make(root) }));
      yield* Database.flush();

      const subtree = yield* Task.collectSubtree(root);

      expect(subtree.map((task) => task.id)).toContain(stray.id);
      expect(Task.subtree([root], root).map((task) => task.id)).toEqual([root.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task] });

const seedTree = () =>
  Effect.gen(function* () {
    const root = yield* Database.add(Task.make({ title: 'root', status: 'todo' }));
    const child = yield* Database.add(Task.make({ title: 'child', status: 'todo', parentTask: Ref.make(root) }));
    const grandchild = yield* Database.add(
      Task.make({ title: 'grandchild', status: 'todo', parentTask: Ref.make(child) }),
    );
    const sibling = yield* Database.add(Task.make({ title: 'sibling', status: 'todo' }));
    yield* Database.flush();
    return { root, child, grandchild, sibling };
  });
