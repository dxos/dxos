//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { URI } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import getProject from './get-project.ts';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Project.Project, Instructions.Instructions, Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text],
  });

describe('get-project', () => {
  it.effect('reports task counts, outline, and artifacts', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      const open = yield* Database.add(Task.make({ [Obj.Parent]: taskSet, title: 'Open', status: 'todo' }));
      const done = yield* Database.add(Task.make({ [Obj.Parent]: taskSet, title: 'Done', status: 'done' }));
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

  it.effect('completes on a task set holding an unresolvable ref', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      const open = yield* Database.add(Task.make({ [Obj.Parent]: taskSet, title: 'Open', status: 'todo' }));
      // A member whose object is not in this space: the shape that stalled the whole read.
      const dangling = yield* Database.makeRef<Task.Task>(URI.make('echo:///01M122P4GNVZ1P982K1K0QG8AY'));
      Obj.update(taskSet, (taskSet) => {
        taskSet.tasks = [Ref.make(open), dangling];
      });
      const project = yield* Database.add(Project.make({ name: 'Spring Blend', taskSet: Ref.make(taskSet) }));
      yield* Database.flush();

      const result = yield* getProject.handler({ project: Ref.make(project) });

      expect(result.taskSet).toEqual({ id: taskSet.id, name: 'Sprint', openCount: 1, totalCount: 1 });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('reports the project status', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Spring Blend' }));
      yield* Database.flush();
      Obj.update(project, (project) => {
        project.status = 'blocked';
      });

      const detail = yield* getProject.handler({ project: Ref.make(project) });

      expect(detail.status).toBe('blocked');
    }).pipe(Effect.provide(testLayer())),
  );
});
