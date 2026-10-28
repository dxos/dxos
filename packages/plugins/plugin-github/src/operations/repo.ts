//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, Filter, Obj } from '@dxos/echo';
import { Repo } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { type GitHubApi } from '../services/index.ts';

/** What names a GitHub repository locally: its numeric id plus the fields a `Repo` mirrors. */
export type RepoDescriptor = {
  /** GitHub's numeric repository id, stringified; the `Repo`'s foreign key. */
  id: string;
  owner: string;
  name: string;
  url?: string;
  description?: string;
  defaultBranch?: string;
};

/** The descriptor for a repository as GitHub's REST API returns it. */
export const toRepoDescriptor = (repo: GitHubApi.GitHubRepo): RepoDescriptor => ({
  id: String(repo.id),
  owner: repo.owner.login,
  name: repo.name,
  url: repo.html_url ?? undefined,
  description: repo.description ?? undefined,
  defaultBranch: repo.default_branch ?? undefined,
});

/** The space's repository at these coordinates, if it holds one. */
export const findRepo = (owner: string, name: string) =>
  Database.query(Filter.type(Repo.Repo, { owner, name })).first.pipe(Effect.map(Option.getOrUndefined));

/**
 * The space's `Repo` for a GitHub repository, added when the space holds none: matched by its GitHub
 * id first, since a renamed or transferred repository keeps it, then by coordinates. A match by
 * coordinates gains the id, so the binding and the sync find it by key from then on.
 */
export const ensureRepo = Effect.fn('ensureRepo')(function* (repo: RepoDescriptor) {
  const repos = yield* Database.query(Filter.type(Repo.Repo)).run;
  const byKey = repos.find((candidate) => Obj.getKeys(candidate, GITHUB_SOURCE).some((key) => key.id === repo.id));
  if (byKey) {
    return byKey;
  }
  const byCoordinates = repos.find((candidate) => candidate.owner === repo.owner && candidate.name === repo.name);
  if (byCoordinates) {
    Obj.update(byCoordinates, (byCoordinates) => {
      Obj.getMeta(byCoordinates).keys.push({ source: GITHUB_SOURCE, id: repo.id });
    });
    return byCoordinates;
  }
  return yield* Database.add(
    Repo.make({
      owner: repo.owner,
      name: repo.name,
      url: repo.url,
      description: repo.description,
      defaultBranch: repo.defaultBranch,
      [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: repo.id }] },
    }),
  );
});
