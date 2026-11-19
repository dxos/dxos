//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Outline, Repo, TaskSet } from '@dxos/types';

import updateRepositories from './update-repositories.ts';

const testLayer = () => TestDatabaseLayer({ types: [Project.Project, Repo.Repo, Outline.Outline, TaskSet.TaskSet] });

describe('update-repositories', () => {
  it.effect('appends new repositories, keeps a listed one in its place, and removes', () =>
    Effect.gen(function* () {
      const [dxos, edge, docs] = yield* Effect.forEach(['dxos', 'edge', 'docs'], (name) =>
        Database.add(Repo.make({ owner: 'dxos', name })),
      );
      const project = yield* Database.add(Project.make({ name: 'Composer' }));
      const ids = (refs: readonly Ref.Ref<Repo.Repo>[]) => refs.map((ref) => ref.peek()?.id);

      const added = yield* updateRepositories.handler({
        project: Ref.make(project),
        add: [Ref.make(dxos), Ref.make(edge)],
      });
      expect(ids(added.repositories)).toEqual([dxos.id, edge.id]);

      const updated = yield* updateRepositories.handler({
        project: Ref.make(project),
        add: [Ref.make(docs), Ref.make(dxos)],
        remove: [Ref.make(edge)],
      });
      expect(ids(updated.repositories)).toEqual([dxos.id, docs.id]);
      expect(ids(Repo.getRepositories(project))).toEqual([dxos.id, docs.id]);

      const read = yield* updateRepositories.handler({ project: Ref.make(project) });
      expect(ids(read.repositories)).toEqual([dxos.id, docs.id]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('sets, replaces and clears the setup script, leaving the repositories alone', () =>
    Effect.gen(function* () {
      const dxos = yield* Database.add(Repo.make({ owner: 'dxos', name: 'dxos' }));
      const project = yield* Database.add(Project.make({ name: 'Composer' }));
      yield* updateRepositories.handler({ project: Ref.make(project), add: [Ref.make(dxos)] });

      const set = yield* updateRepositories.handler({ project: Ref.make(project), setupScript: 'proto install\n' });
      expect(set.setupScript).toBe('proto install\n');
      expect(Repo.getSetupScript(project)).toBe('proto install\n');
      expect(set.repositories).toHaveLength(1);

      // Without `setupScript` the script is read, not changed.
      expect((yield* updateRepositories.handler({ project: Ref.make(project) })).setupScript).toBe('proto install\n');
      expect(
        (yield* updateRepositories.handler({ project: Ref.make(project), add: [Ref.make(dxos)] })).setupScript,
      ).toBe('proto install\n');

      const replaced = yield* updateRepositories.handler({ project: Ref.make(project), setupScript: 'echo two' });
      expect(replaced.setupScript).toBe('echo two');

      const cleared = yield* updateRepositories.handler({ project: Ref.make(project), setupScript: '  \n' });
      expect(cleared.setupScript).toBeUndefined();
      expect(Repo.getSetupScript(project)).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );
});
