//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import assignTask from './assign-task';
import completeTask from './complete-task';
import createMilestone from './create-milestone';
import createTask from './create-task';
import deleteMilestone from './delete-milestone';
import deleteTask from './delete-task';
import listMilestones from './list-milestones';
import listTasks from './list-tasks';
import moveTask from './move-task';
import updateTask from './update-task';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet],
  });

describe('task operations', () => {
  it.effect("create-task defaults status and joins the set's tasks array", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: '  Ship it  ' });
      const task = yield* loadTask(snapshot);

      expect(task.title).toBe('Ship it');
      expect(task.status).toBe('todo');
      // Membership is the array; the parent edge rides along so the task cascades with the set.
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a sub-task joins the same flat array and points at its parent', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const parent = yield* loadTask(parentSnapshot);

      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      expect(child.parentTask?.target?.id).toBe(parent.id);
      // Flat: enumerating the set is one array read, sub-tasks included.
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
      expect(TaskSet.rootTasks(TaskSet.resolveTasks(taskSet)).map((task) => task.id)).toEqual([parent.id]);
      // The parent edge follows the hierarchy so the sub-task cascades with its parent task.
      expect(Obj.getParent(child)?.id).toBe(parent.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-task patches only the provided fields', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task: snapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Draft',
        priority: 'low',
      });
      const task = yield* loadTask(snapshot);

      yield* updateTask.handler({ task: Ref.make(task), status: 'in-progress', estimate: 3 });

      expect(task.title).toBe('Draft');
      expect(task.priority).toBe('low');
      expect(task.status).toBe('in-progress');
      expect(task.estimate).toBe(3);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('complete-task marks done; assign-task sets the actor', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Review' });
      const task = yield* loadTask(snapshot);

      yield* assignTask.handler({ task: Ref.make(task), assignee: { role: 'assistant', name: 'Scout' } });
      yield* completeTask.handler({ task: Ref.make(task) });

      expect(task.assignee).toMatchObject({ role: 'assistant', name: 'Scout' });
      expect(task.status).toBe('done');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('list-tasks filters by status and assignee, and excludes sub-tasks by default', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: doneSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Done thing' });
      const done = yield* loadTask(doneSnapshot);
      yield* completeTask.handler({ task: Ref.make(done) });
      const { task: openSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Open thing' });
      const open = yield* loadTask(openSnapshot);
      yield* assignTask.handler({ task: Ref.make(open), assignee: { email: 'kai@example.com' } });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Sub thing', parentTask: Ref.make(open) });

      // Root tasks only.
      const all = yield* listTasks.handler({ taskSet: Ref.make(taskSet) });
      expect(titles(all.tasks)).toEqual(['Done thing', 'Open thing']);

      const withSubtasks = yield* listTasks.handler({ taskSet: Ref.make(taskSet), includeSubtasks: true });
      expect(titles(withSubtasks.tasks).sort()).toEqual(['Done thing', 'Open thing', 'Sub thing']);

      const byStatus = yield* listTasks.handler({ taskSet: Ref.make(taskSet), status: 'done' });
      expect(titles(byStatus.tasks)).toEqual(['Done thing']);

      const byAssignee = yield* listTasks.handler({ taskSet: Ref.make(taskSet), assignee: 'KAI@example.com' });
      expect(titles(byAssignee.tasks)).toEqual(['Open thing']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('list-tasks pages with after/limit and stops issuing a cursor at the end', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      for (const title of ['a', 'b', 'c']) {
        yield* createTask.handler({ taskSet: Ref.make(taskSet), title });
      }

      const first = yield* listTasks.handler({ taskSet: Ref.make(taskSet), limit: 2 });
      expect(first.tasks).toHaveLength(2);
      expect(first.nextCursor).toBeDefined();

      const second = yield* listTasks.handler({ taskSet: Ref.make(taskSet), limit: 2, after: first.nextCursor });
      expect(second.tasks).toHaveLength(1);
      expect(second.nextCursor).toBeUndefined();

      expect([...titles(first.tasks), ...titles(second.tasks)].sort()).toEqual(['a', 'b', 'c']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('list-tasks requires a container', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(listTasks.handler({}));
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('delete-task sweeps the task and its sub-tasks out of the array', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const parent = yield* loadTask(parentSnapshot);
      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);
      const { task: keptSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Kept' });
      const kept = yield* loadTask(keptSnapshot);

      const { deleted } = yield* deleteTask.handler({ task: Ref.make(parent) });

      // The database cascade takes the sub-task, so the array sweep must take it too — otherwise
      // the set keeps a ref to an object that no longer exists.
      expect([...deleted].sort()).toEqual([child.id, parent.id].sort());
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([kept.id]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('move-task reorders within the set, since array order is the task order', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const created = [];
      for (const title of ['a', 'b', 'c']) {
        const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title });
        created.push(yield* loadTask(snapshot));
      }
      const [first, , third] = created;

      yield* moveTask.handler({ task: Ref.make(third), before: Ref.make(first) });
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(['c', 'a', 'b']);

      yield* moveTask.handler({ task: Ref.make(third) });
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(['a', 'b', 'c']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('milestones sequence the set and report derived progress', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone: snapshot } = yield* createMilestone.handler({
        taskSet: Ref.make(taskSet),
        name: 'Alpha',
        description: 'Ships to staging',
      });
      const milestone = yield* loadMilestone(snapshot);

      const { task: doneSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Done',
        milestone: Ref.make(milestone),
      });
      yield* completeTask.handler({ task: Ref.make(yield* loadTask(doneSnapshot)) });
      yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Open',
        milestone: Ref.make(milestone),
      });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Unfiled' });

      const { milestones } = yield* listMilestones.handler({ taskSet: Ref.make(taskSet) });
      expect(milestones).toEqual([
        { id: milestone.id, name: 'Alpha', description: 'Ships to staging', targetDate: undefined, total: 2, done: 1 },
      ]);

      const filed = yield* listTasks.handler({ taskSet: Ref.make(taskSet), milestone: Ref.make(milestone) });
      expect(titles(filed.tasks)).toEqual(['Done', 'Open']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("a task cannot be filed under another set's milestone", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Ours' }));
      const other = yield* Database.add(TaskSet.make({ name: 'Theirs' }));
      yield* Database.flush();
      const { milestone: snapshot } = yield* createMilestone.handler({ taskSet: Ref.make(other), name: 'Foreign' });
      const foreign = yield* loadMilestone(snapshot);

      const exit = yield* Effect.exit(
        createTask.handler({ taskSet: Ref.make(taskSet), title: 'Nope', milestone: Ref.make(foreign) }),
      );
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('deleting a milestone releases its tasks to the backlog instead of deleting them', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone: snapshot } = yield* createMilestone.handler({ taskSet: Ref.make(taskSet), name: 'Alpha' });
      const milestone = yield* loadMilestone(snapshot);
      const { task: taskSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Survives',
        milestone: Ref.make(milestone),
      });
      const task = yield* loadTask(taskSnapshot);

      const { releasedTasks } = yield* deleteMilestone.handler({ milestone: Ref.make(milestone) });

      // Matches Linear/GitHub: removing a milestone is not a way to delete the work under it.
      expect(releasedTasks).toBe(1);
      expect(taskSet.milestones).toHaveLength(0);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(task.milestone).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-task refuses to re-parent a task under its own sub-task', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const parent = yield* loadTask(parentSnapshot);
      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      const exit = yield* Effect.exit(updateTask.handler({ task: Ref.make(parent), parentTask: Ref.make(child) }));
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-task promotes a sub-task back to a root with a null parentTask', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const parent = yield* loadTask(parentSnapshot);
      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      expect(child.parentTask).toBeUndefined();
      // Lifecycle follows: a root task cascades with the set, not with its former parent.
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Titles off either the JSON snapshots a handler returns or live task objects. */
const titles = (tasks: readonly unknown[]): string[] => tasks.map((task) => (task as { title: string }).title);

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);

const loadMilestone = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Milestone.Milestone);
