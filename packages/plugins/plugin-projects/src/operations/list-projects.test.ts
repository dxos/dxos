//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import listProjects from './list-projects';
import updateProject from './update-project';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Project.Project, Instructions.Instructions, Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text],
  });

describe('list-projects', () => {
  it.effect('returns summary rows and filters by name', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.add(Project.make({ name: 'Spring Blend', taskSet: Ref.make(taskSet) }));
      yield* Database.add(Project.make({ name: 'Autumn Roast' }));
      yield* Database.flush();

      const all = yield* listProjects.handler({});
      expect(all.projects).toHaveLength(2);

      const matched = yield* listProjects.handler({ match: 'spring' });
      expect(matched.projects).toHaveLength(1);
      expect(matched.projects[0]).toMatchObject({ name: 'Spring Blend', hasTaskSet: true });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('reports the status a project was updated to', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Spring Blend' }));
      yield* Database.flush();
      yield* updateProject.handler({ project: Ref.make(project), status: 'blocked' });

      const listed = yield* listProjects.handler({});

      expect(listed.projects[0]).toMatchObject({ name: 'Spring Blend', status: 'blocked' });
    }).pipe(Effect.provide(testLayer())),
  );
});
