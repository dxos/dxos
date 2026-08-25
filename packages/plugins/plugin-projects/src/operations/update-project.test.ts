//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, EID, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import updateProject from './update-project';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Project.Project, Instructions.Instructions, Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text],
  });

describe('update-project', () => {
  it.effect('patches only the provided fields', () =>
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

  it.effect('sets the work-stream status on the live object and in the snapshot', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Spring Blend' }));
      yield* Database.flush();

      const { project: snapshot } = yield* updateProject.handler({ project: Ref.make(project), status: 'blocked' });

      expect(project.status).toBe('blocked');
      expect((snapshot as { status?: string }).status).toBe('blocked');
    }).pipe(Effect.provide(testLayer())),
  );
});
