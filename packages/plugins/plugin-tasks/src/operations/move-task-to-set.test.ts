//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone.ts';
import createTask from './create-task.ts';
import moveTaskToSet from './move-task-to-set.ts';
import moveTask from './move-task.ts';

const TestLayer = TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('move-task-to-set', () => {
  it.effect('moves the task and its subtree into the target set, in order', () =>
    Effect.gen(function* () {
      const { source, target } = yield* makeSets();
      const [parent, sibling, child, grandchild] = yield* seedTasks(source, ['a', 'b', 'c', 'd']);
      yield* moveTask.handler({ taskSet: Ref.make(source), task: Ref.make(child), parentTask: Ref.make(parent) });
      yield* moveTask.handler({ taskSet: Ref.make(source), task: Ref.make(grandchild), parentTask: Ref.make(child) });
      yield* seedTasks(target, ['x']);

      const { moved } = yield* moveTaskToSet.handler({ task: Ref.make(parent), taskSet: Ref.make(target) });
      expect(new Set(moved)).toEqual(new Set([parent.id, child.id, grandchild.id]));

      expect(titles(TaskSet.resolveTasks(source))).toEqual(['b']);
      const tasks = TaskSet.resolveTasks(target);
      expect(titles(tasks)).toEqual(['x', 'a', 'c', 'd']);
      expect(titles(Task.rootTasks(tasks))).toEqual(['x', 'a']);
      expect(titles(Task.subTasks(tasks, parent))).toEqual(['c']);
      expect(titles(Task.subTasks(tasks, child))).toEqual(['d']);

      // Membership is the ECHO parent edge as well as the array; both must follow the move.
      for (const task of [parent, child, grandchild]) {
        expect(Obj.getParent(task)?.id).toEqual(target.id);
        expect((yield* TaskSet.findTaskSet(task))?.id).toEqual(target.id);
      }
      expect(Obj.getParent(sibling)?.id).toEqual(source.id);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a moved sub-task leaves its parent behind and arrives as a root', () =>
    Effect.gen(function* () {
      const { source, target } = yield* makeSets();
      const [parent, child] = yield* seedTasks(source, ['a', 'b']);
      yield* moveTask.handler({ taskSet: Ref.make(source), task: Ref.make(child), parentTask: Ref.make(parent) });

      yield* moveTaskToSet.handler({ task: Ref.make(child), taskSet: Ref.make(target) });

      expect(child.parentTask).toBeUndefined();
      expect(titles(Task.rootTasks(TaskSet.resolveTasks(target)))).toEqual(['b']);
      expect(titles(TaskSet.resolveTasks(source))).toEqual(['a']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('clears milestones, which belong to the old set, and keeps dependsOn', () =>
    Effect.gen(function* () {
      const { source, target } = yield* makeSets();
      const { milestone } = yield* createMilestone.handler({ taskSet: Ref.make(source), name: 'Alpha' });
      const [blocker] = yield* seedTasks(source, ['blocker']);
      const { task: parent } = yield* createTask.handler({
        taskSet: Ref.make(source),
        title: 'a',
        milestone: Ref.make(milestone),
      });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(source),
        title: 'b',
        milestone: Ref.make(milestone),
      });
      yield* moveTask.handler({ taskSet: Ref.make(source), task: Ref.make(child), parentTask: Ref.make(parent) });
      Obj.update(parent, (parent) => {
        parent.dependsOn = [Ref.make(blocker)];
      });

      yield* moveTaskToSet.handler({ task: Ref.make(parent), taskSet: Ref.make(target) });

      expect(parent.milestone).toBeUndefined();
      expect(child.milestone).toBeUndefined();
      expect(TaskSet.resolveMilestones(source).map(({ name }) => name)).toEqual(['Alpha']);
      expect(parent.dependsOn?.map((ref) => Task.refEntityId(ref))).toEqual([blocker.id]);
      // Readiness is resolved within the viewing set, so the dependency left behind does not block.
      expect(Task.isTaskReady(TaskSet.resolveTasks(target), parent)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('rejects a move into the set the task already belongs to', () =>
    Effect.gen(function* () {
      const { source } = yield* makeSets();
      const [task] = yield* seedTasks(source, ['a', 'b']);

      const result = yield* Effect.exit(moveTaskToSet.handler({ task: Ref.make(task), taskSet: Ref.make(source) }));
      expect(result._tag).toEqual('Failure');
      expect(titles(TaskSet.resolveTasks(source))).toEqual(['a', 'b']);
    }).pipe(Effect.provide(TestLayer)),
  );
});

const makeSets = () =>
  Effect.gen(function* () {
    const source = yield* Database.add(TaskSet.make({ name: 'Source' }));
    const target = yield* Database.add(TaskSet.make({ name: 'Target' }));
    yield* Database.flush();
    return { source, target };
  });

const seedTasks = (taskSet: TaskSet.TaskSet, names: string[]) =>
  Effect.gen(function* () {
    const created: Task.Task[] = [];
    for (const title of names) {
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title });
      created.push(task);
    }
    return created;
  });

const titles = (tasks: readonly Task.Task[]): (string | undefined)[] => tasks.map((task) => task.title);
