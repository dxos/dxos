//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, Filter, Obj } from '@dxos/echo';
import { Repo } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { type GitHubApi } from '../services/index.ts';

/** The space's repository at these coordinates, if it holds one. */
export const findRepo = (owner: string, name: string) =>
  Database.query(Filter.type(Repo.Repo, { owner, name })).first.pipe(Effect.map(Option.getOrUndefined));

/**
 * The space's `Repo` for a GitHub repository, added when the space holds none: matched by its GitHub
 * id first, since a renamed or transferred repository keeps it, then by coordinates.
 */
export const ensureRepo = (repo: GitHubApi.GitHubRepo) =>
  Effect.gen(function* () {
    const id = String(repo.id);
    const repos = yield* Database.query(Filter.type(Repo.Repo)).run;
    const existing =
      repos.find((candidate) => Obj.getKeys(candidate, GITHUB_SOURCE).some((key) => key.id === id)) ??
      repos.find((candidate) => candidate.owner === repo.owner.login && candidate.name === repo.name);
    if (existing) {
      return existing;
    }
    return yield* Database.add(
      Repo.make({
        owner: repo.owner.login,
        name: repo.name,
        url: repo.html_url ?? undefined,
        description: repo.description ?? undefined,
        defaultBranch: repo.default_branch ?? undefined,
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id }] },
      }),
    );
  });
