//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Organization, Task, TaskSet } from '@dxos/types';

import addArtifact from './add-artifact.ts';
import createTask from './create-task.ts';

describe('add-artifact', () => {
  it.effect('records the object on the task once', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      const artifact = yield* Database.add(Organization.make({ name: 'Acme' }));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Research Acme' });

      yield* addArtifact.handler({ task: Ref.make(task), object: Ref.make(artifact) });
      yield* addArtifact.handler({ task: Ref.make(task), object: Ref.make(artifact) });

      expect(task.artifacts?.map((ref) => ref.target?.id)).toEqual([artifact.id]);
    }).pipe(
      Effect.provide(
        TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet, Organization.Organization] }),
      ),
    ),
  );
});
