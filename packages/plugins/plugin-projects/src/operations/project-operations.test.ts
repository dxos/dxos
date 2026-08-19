//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, EID, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import getProject from './get-project';
import listProjects from './list-projects';
import updateProject from './update-project';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Project.Project, Instructions.Instructions, Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text],
  });

describe('project operations', () => {
  it.effect('list-projects returns summary rows and filters by name', () =>
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

  it.effect('get-project reports task counts, outline, and artifacts', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      const open = yield* Database.add(Task.make({ title: 'Open', status: 'todo' }));
      const done = yield* Database.add(Task.make({ title: 'Done', status: 'done' }));
      Obj.setParent(open, taskSet);
      Obj.setParent(done, taskSet);
      Obj.update(taskSet, (taskSet) => {
        taskSet.tasks = [Ref.make(open), Ref.make(done)];
      });

      const outline = yield* Database.add(Outline.make({ name: 'Notes', content: '- [ ] first' }));
      const artifact = yield* Database.add(Text.make({ content: 'doc' }));

      const project = yield* Database.add(
        Project.make({
          name: 'Spring Blend',
          taskSet: Ref.make(taskSet),
          outline: Ref.make(outline),
          artifacts: [Ref.make(artifact)],
        }),
      );
      yield* Database.flush();

      const result = yield* getProject.handler({ project: Ref.make(project) });

      expect(result.name).toBe('Spring Blend');
      expect(result.taskSet).toEqual({ id: taskSet.id, name: 'Sprint', openCount: 1, totalCount: 2 });
      expect(result.outline?.content).toContain('- [ ] first');
      expect(result.artifacts).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('status round-trips through update, list, and get', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Spring Blend' }));
      yield* Database.flush();

      const { project: snapshot } = yield* updateProject.handler({ project: Ref.make(project), status: 'blocked' });
      expect(project.status).toBe('blocked');
      expect((snapshot as { status?: string }).status).toBe('blocked');

      const listed = yield* listProjects.handler({});
      expect(listed.projects[0]).toMatchObject({ name: 'Spring Blend', status: 'blocked' });

      const detail = yield* getProject.handler({ project: Ref.make(project) });
      expect(detail.status).toBe('blocked');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-project patches only the provided fields', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Spring Blend', description: 'seasonal' }));
      yield* Database.flush();

      yield* updateProject.handler({ project: Ref.make(project), status: 'paused' });

      expect(project.name).toBe('Spring Blend');
      expect(project.description).toBe('seasonal');
      expect(project.status).toBe('paused');

      const { project: snapshot } = yield* updateProject.handler({ project: Ref.make(project), name: 'Renamed' });
      expect(project.name).toBe('Renamed');
      // The handler returns a wire-safe snapshot, not the live object.
      expect((snapshot as { id: string }).id).toBe(project.id);
      expect(yield* Database.resolve(EID.parse(`echo:///${project.id}`), Project.Project)).toBeDefined();
    }).pipe(Effect.provide(testLayer())),
  );
});
