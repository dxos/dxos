//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import convertToTask from './convert-to-task';

describe('convert-to-task', () => {
  it.effect('promotes an item into the task set the caller names', () =>
    Effect.gen(function* () {
      const taskSet = yield* seed();

      const { task } = yield* convertToTask.handler({ taskSet, title: '  first  ' });

      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(task.title).toBe('first');
      expect(task.status).toBe('todo');
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text] }))),
  );

  it.effect('a second promotion appends to the same set rather than creating another', () =>
    Effect.gen(function* () {
      const taskSet = yield* seed();

      const { task: first } = yield* convertToTask.handler({ taskSet, title: 'first' });
      const { task: second } = yield* convertToTask.handler({ taskSet, title: 'second' });

      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([first.id, second.id]);
      const sets = yield* Database.query(Filter.type(TaskSet.TaskSet)).run;
      expect(sets).toHaveLength(1);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text] }))),
  );

  it.effect('the outline markdown is left untouched — the item is copied, not moved', () =>
    Effect.gen(function* () {
      const taskSet = yield* seed();
      const outline = yield* Database.add(Outline.make({ name: 'Launch plan', content: '- [ ] first\n- [ ] second' }));
      yield* Database.flush();

      yield* convertToTask.handler({ taskSet, title: 'first' });

      const content = yield* Database.load(outline.content);
      expect(content.content).toBe('- [ ] first\n- [ ] second');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text] }))),
  );

  it.effect('a title the caller invents is promoted like any other', () =>
    Effect.gen(function* () {
      const taskSet = yield* seed();

      const { task } = yield* convertToTask.handler({ taskSet, title: 'invented' });

      expect(task.title).toBe('invented');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text] }))),
  );
});

const seed = () =>
  Effect.gen(function* () {
    const taskSet = yield* Database.add(TaskSet.make({ name: 'Launch plan' }));
    yield* Database.flush();
    return taskSet;
  });
