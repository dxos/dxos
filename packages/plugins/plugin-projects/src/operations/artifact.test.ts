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

import artifactAdd from './artifact-add';
import artifactList from './artifact-list';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Project.Project, Instructions.Instructions, Text.Text],
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
