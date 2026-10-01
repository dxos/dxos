//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, type Ref } from '@dxos/echo';

import { type Repository, RepositoryOperation, RepositoryService } from '#types';

/** The repository's space and id, as the service addresses it. */
const resolve = Effect.fn(function* (repository: Ref.Ref<Repository.Repository>) {
  const { db } = yield* Database.Service;
  const loaded = yield* Database.load(repository);
  return { spaceId: db.spaceId, repositoryId: loaded.id, service: yield* RepositoryService.Service };
});

export const branches = RepositoryOperation.GetBranches.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ repository }) {
      const { spaceId, repositoryId, service } = yield* resolve(repository);
      return yield* service.branches(spaceId, repositoryId).pipe(Effect.orDie);
    }),
  ),
);

export const log = RepositoryOperation.GetLog.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ repository, ref, limit, offset }) {
      const { spaceId, repositoryId, service } = yield* resolve(repository);
      const commits = yield* service.log(spaceId, repositoryId, { ref, limit, offset }).pipe(Effect.orDie);
      return { commits };
    }),
  ),
);

export const tree = RepositoryOperation.GetTree.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ repository, ref, path }) {
      const { spaceId, repositoryId, service } = yield* resolve(repository);
      return yield* service.tree(spaceId, repositoryId, { ref, path }).pipe(Effect.orDie);
    }),
  ),
);

export const readFile = RepositoryOperation.ReadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ repository, ref, path }) {
      const { spaceId, repositoryId, service } = yield* resolve(repository);
      return yield* service.readFile(spaceId, repositoryId, { ref, path }).pipe(Effect.orDie);
    }),
  ),
);
