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

describe('create-task', () => {
  it.effect("defaults status and joins the set's tasks array", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: '  Ship it  ' });

      expect(task.title).toBe('Ship it');
      expect(task.status).toBe('todo');
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect("a sub-task is listed and owned by its parent, not the set's roots", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });

      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one',
        parentTask: Ref.make(parent),
      });

      expect(Task.parentTaskId(child)).toBe(parent.id);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id]);
      expect(parent.subtasks?.map((ref) => ref.target?.id)).toEqual([child.id]);
      expect(TaskSet.resolveTasks(taskSet).map((task) => task.id)).toEqual([parent.id, child.id]);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('a sub-task filed under a delegated task answers to the same person, so its finish waits on them', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const delegate = { role: 'assistant' as const, name: 'agent', identityDid: 'did:key:agent' };
      const { task: parent } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Epic',
        assignee: { name: 'Riley', identityDid: 'did:key:riley' },
        delegate,
      });
      const { task: own } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Agent epic',
        assignee: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });
      // An agent's own task queued for a sub-agent, as the delegation verbs write it.
      Obj.update(own, (own) => {
        own.delegate = { role: 'assistant' };
      });

      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one',
        status: 'done',
        parentTask: Ref.make(parent),
      });
      const { task: ownChild } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Agent step',
        status: 'done',
        parentTask: Ref.make(own),
      });

      expect(child.assignee?.name).toBe('Riley');
      expect(child.delegate).toBeUndefined();
      expect(child.status).toBe('review');

      // The session working the tree files a step it holds: it answers to the tree's person, not whoever it names.
      const { task: held } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step two',
        delegate,
        parentTask: Ref.make(parent),
      });
      expect(held.assignee?.name).toBe('Riley');
      expect(held.delegate?.name).toBe('agent');
      // A level further down, under a step that answers to Riley but is not itself delegated.
      const { task: deeper } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one, part a',
        delegate,
        parentTask: Ref.make(child),
      });
      expect(deeper.assignee?.name).toBe('Riley');
      expect(ownChild.assignee).toBeUndefined();
      expect(ownChild.delegate).toBeUndefined();
      expect(ownChild.status).toBe('done');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect("a step takes its parent's person, stored down the tree, over a person an agent names", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const riley = { name: 'Riley', identityDid: 'did:key:riley' };
      const sam = { name: 'Sam', identityDid: 'did:key:sam' };
      const delegate = { role: 'assistant' as const, name: 'agent', identityDid: 'did:key:agent' };
      const { task: root } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic', assignee: riley });
      const { task: step } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step',
        parentTask: Ref.make(root),
      });
      expect(step.assignee?.name).toBe('Riley');

      const { task: plain } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Part a',
        status: 'done',
        parentTask: Ref.make(step),
      });
      expect(plain.assignee?.name).toBe('Riley');
      expect(plain.status).toBe('review');

      // An agent filing a step it holds names whoever it works for; the tree's person wins.
      const { task: held } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Part b',
        assignee: sam,
        delegate,
        parentTask: Ref.make(step),
      });
      expect(held.assignee?.name).toBe('Riley');

      // A person naming someone for a step is that step's own person.
      const { task: picked } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Part c',
        assignee: sam,
        parentTask: Ref.make(step),
      });
      expect(picked.assignee?.name).toBe('Sam');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect("a task cannot be filed under another set's milestone", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Ours' }));
      const other = yield* Database.add(TaskSet.make({ name: 'Theirs' }));
      yield* Database.flush();
      const { milestone: foreign } = yield* createMilestone.handler({ taskSet: Ref.make(other), name: 'Foreign' });

      const exit = yield* Effect.exit(
        createTask.handler({ taskSet: Ref.make(taskSet), title: 'Nope', milestone: Ref.make(foreign) }),
      );
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('a task is created delegated only with a person answering for it, and created finished waits on them', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const delegate = { role: 'assistant' as const, name: 'agent', identityDid: 'did:key:agent' };

      const unowned = yield* Effect.exit(createTask.handler({ taskSet: Ref.make(taskSet), title: 'Nope', delegate }));
      expect(unowned._tag).toBe('Failure');
      // The delegate is the agent doing the work; a person there would read as an agent at work.
      const person = yield* Effect.exit(
        createTask.handler({
          taskSet: Ref.make(taskSet),
          title: 'Nope',
          assignee: { name: 'Riley', identityDid: 'did:key:riley' },
          delegate: { name: 'Sam', identityDid: 'did:key:sam' },
        }),
      );
      expect(person._tag).toBe('Failure');

      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Ship it',
        assignee: { name: 'Riley', identityDid: 'did:key:riley' },
        delegate,
      });
      expect(task.delegate?.name).toBe('agent');

      const { task: finished } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Shipped',
        status: 'done',
        assignee: { name: 'Riley', identityDid: 'did:key:riley' },
        delegate,
      });
      expect(finished.status).toBe('review');

      // The operation cannot tell who is asking: a person's own Done signs off through AcceptTask.
      const { task: own } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Shipped myself',
        status: 'done',
        assignee: { name: 'Riley', identityDid: 'did:key:riley' },
      });
      expect(own.status).toBe('review');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
