//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Repo } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { type GitHubApi } from '../services/index.ts';
import { ensureRepo, findRepo, toRepoDescriptor } from './repo.ts';

const github: GitHubApi.GitHubRepo = {
  id: 42,
  name: 'dxos',
  full_name: 'dxos/dxos',
  html_url: 'https://github.com/dxos/dxos',
  default_branch: 'main',
  owner: { id: 1, login: 'dxos' },
};

describe('ensureRepo', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Repo.Repo]);
    return db;
  };

  test('files a repository the space does not hold, keyed by its GitHub id', async ({ expect }) => {
    const db = await setup();
    await Effect.gen(function* () {
      const repo = yield* ensureRepo(toRepoDescriptor(github));
      expect(repo).toMatchObject({ owner: 'dxos', name: 'dxos', url: github.html_url, defaultBranch: 'main' });
      expect(Obj.getKeys(repo, GITHUB_SOURCE)).toEqual([{ source: GITHUB_SOURCE, id: '42' }]);
      expect((yield* findRepo('dxos', 'dxos'))?.id).toBe(repo.id);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('returns the repository the space holds, by GitHub id after a rename or by coordinates', async ({ expect }) => {
    const db = await setup();
    const renamed = db.add(
      Repo.make({ owner: 'dxos', name: 'old-name', [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '42' }] } }),
    );
    const typed = db.add(Repo.make({ owner: 'dxos', name: 'edge' }));
    await Effect.gen(function* () {
      expect((yield* ensureRepo(toRepoDescriptor(github))).id).toBe(renamed.id);
      const edge = toRepoDescriptor({ ...github, id: 7, name: 'edge', full_name: 'dxos/edge' });
      expect((yield* ensureRepo(edge)).id).toBe(typed.id);
      // A match by coordinates gains the key, so the next lookup finds it by id.
      expect(Obj.getKeys(typed, GITHUB_SOURCE)).toEqual([{ source: GITHUB_SOURCE, id: '7' }]);
      expect(yield* Database.query(Filter.type(Repo.Repo)).run).toHaveLength(2);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });
});
