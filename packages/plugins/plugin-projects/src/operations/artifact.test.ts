//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Task } from '@dxos/types';

import artifactAdd from './artifact-add.ts';
import artifactList from './artifact-list.ts';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Project.Project, Instructions.Instructions, Text.Text, Task.Task],
  });

describe('project skill operations', () => {
  it.effect('artifact-add appends to the project; adding twice is a no-op', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Voyage' }));
      const doc = yield* Database.add(Text.make({ content: 'notes' }));
      yield* Database.flush();

      yield* artifactAdd.handler({ project: Ref.make(project), object: Ref.make(doc) });
      expect(project.artifacts).toHaveLength(1);

      yield* artifactAdd.handler({ project: Ref.make(project), object: Ref.make(doc) });
      expect(project.artifacts).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('artifact-add also records the object on the task it was made for', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Voyage' }));
      const task = yield* Database.add(Task.make({ title: 'Write a poem' }));
      const doc = yield* Database.add(Text.make({ content: 'A short poem.' }));
      yield* Database.flush();

      yield* artifactAdd.handler({ project: Ref.make(project), object: Ref.make(doc), task: Ref.make(task) });

      // Both places: the project owns everything it holds, the task shows what it produced.
      expect(project.artifacts).toHaveLength(1);
      expect(Task.refEntityId(task.artifacts?.[0])).toBe(doc.id);

      // Refs, not children — finishing the task must not cascade to the document.
      expect(Obj.getParent(doc)?.id).not.toBe(task.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('artifact-list returns dxn, typename, and label per artifact', () =>
    Effect.gen(function* () {
      const doc = yield* Database.add(Text.make({ content: 'notes' }));
      const project = yield* Database.add(Project.make({ name: 'Voyage', artifacts: [Ref.make(doc)] }));
      yield* Database.flush();

      const { artifacts } = yield* artifactList.handler({ project: Ref.make(project) });
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].dxn).toBe(Obj.getURI(doc));
      expect(artifacts[0].typename).toBe('org.dxos.type.text');
      expect(artifacts[0].label).toBe(Obj.getLabel(doc));
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('artifact-list is empty for a project with no artifacts', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Bare' }));
      yield* Database.flush();

      const { artifacts } = yield* artifactList.handler({ project: Ref.make(project) });
      expect(artifacts).toEqual([]);
    }).pipe(Effect.provide(testLayer())),
  );
});
