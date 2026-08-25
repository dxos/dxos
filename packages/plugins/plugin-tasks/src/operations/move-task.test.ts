//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task';
import moveTask from './move-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('move-task', () => {
  it.effect('reorders within the set, since array order is the task order', () =>
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
});

/** Titles off either the JSON snapshots a handler returns or live task objects. */
const titles = (tasks: readonly unknown[]): string[] => tasks.map((task) => (task as { title: string }).title);

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);
