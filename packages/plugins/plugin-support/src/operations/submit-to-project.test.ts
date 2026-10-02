//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import { Blob, Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { File, Outline, Task, TaskSet } from '@dxos/types';

import { ProjectNotReportableError } from '../errors.ts';
import submitToProject, { taskDescription } from './submit-to-project.ts';

const testLayer = TestDatabaseLayer({
  types: [Blob.Blob, File.File, Outline.Outline, Project.Project, Task.Task, TaskSet.TaskSet],
});

describe('submitToProject', () => {
  it.effect('files the report as a task in the project and attaches the files', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Composer Bugs' }));
      const screenshot = yield* File.fromBytes(new Uint8Array([1, 2, 3]), {
        name: 'screenshot.jpg',
        type: 'image/jpeg',
      });
      yield* Database.add(screenshot);
      yield* Database.flush();

      const { task } = yield* submitToProject.handler({
        project: Ref.make(project),
        report: { title: ' Drag snaps back ', body: 'The card returns.', severity: 'High priority', version: '1.2.3' },
        attachments: [Ref.make(screenshot)],
      });

      expect(task.title).toEqual('Drag snaps back');
      expect(task.priority).toEqual('high');
      expect(task.description).toEqual('The card returns.\n\n- Severity: High priority\n- Version: 1.2.3');
      expect(task.attachments?.map((ref) => Task.refEntityId(ref))).toEqual([screenshot.id]);
      expect(Obj.getParent(screenshot)?.id).toEqual(task.id);
      expect(Obj.getParent(task)?.id).toEqual(Task.refEntityId(project.taskSet));
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect('refuses a project without a task set', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Empty' }));
      Obj.update(project, (project) => {
        project.taskSet = undefined;
      });
      yield* Database.flush();

      const error = yield* Effect.flip(
        submitToProject.handler({ project: Ref.make(project), report: { title: 'Title', body: 'Body' } }),
      );
      expect(error).toBeInstanceOf(ProjectNotReportableError);
    }).pipe(Effect.provide(testLayer)),
  );

  it('leaves a report without metadata as its body', ({ expect }) => {
    expect(taskDescription({ title: 'Title', body: 'Body' })).toEqual('Body');
  });
});
