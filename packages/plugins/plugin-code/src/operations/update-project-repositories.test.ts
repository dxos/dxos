//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Outline, Repo, TaskSet } from '@dxos/types';

import updateProjectRepositories from './update-project-repositories.ts';

const testLayer = () => TestDatabaseLayer({ types: [Project.Project, Repo.Repo, Outline.Outline, TaskSet.TaskSet] });

describe('update-project-repositories', () => {
  it.effect('appends new repositories, keeps a listed one in its place, and removes', () =>
    Effect.gen(function* () {
      const [dxos, edge, docs] = yield* Effect.forEach(['dxos', 'edge', 'docs'], (name) =>
        Database.add(Repo.make({ owner: 'dxos', name })),
      );
      const project = yield* Database.add(Project.make({ name: 'Composer' }));
      const ids = (refs: readonly Ref.Ref<Repo.Repo>[]) => refs.map((ref) => ref.peek()?.id);

      const added = yield* updateProjectRepositories.handler({
        project: Ref.make(project),
        add: [Ref.make(dxos), Ref.make(edge)],
      });
      expect(ids(added.repositories)).toEqual([dxos.id, edge.id]);

      const updated = yield* updateProjectRepositories.handler({
        project: Ref.make(project),
        add: [Ref.make(docs), Ref.make(dxos)],
        remove: [Ref.make(edge)],
      });
      expect(ids(updated.repositories)).toEqual([dxos.id, docs.id]);
      expect(ids(Repo.getRepositories(project))).toEqual([dxos.id, docs.id]);

      const read = yield* updateProjectRepositories.handler({ project: Ref.make(project) });
      expect(ids(read.repositories)).toEqual([dxos.id, docs.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});
