//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { RepositoryOperation, RepositoryService } from '#types';

/**
 * A failed request is reported as an unsuccessful result rather than raised, as `Exec` does: the
 * operation has no error channel, and the reason is what the model can act on.
 */
const failure = (repository: string, branch: string | undefined, error: RepositoryService.RepositoryError) =>
  Effect.succeed({
    repository,
    branch: branch ?? '',
    success: false,
    output: `repository request failed: ${error.message}`,
  });

export const push = RepositoryOperation.Push.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, repository, path, branch, message, force }) {
      const { db } = yield* Database.Service;
      const [loadedSandbox, loadedRepository] = yield* Effect.all([Database.load(sandbox), Database.load(repository)]);
      const repositoryService = yield* RepositoryService.Service;
      return yield* repositoryService
        .push(db.spaceId, loadedSandbox.id, { repositoryId: loadedRepository.id, path, branch, message, force })
        .pipe(Effect.catch((error) => failure(loadedRepository.id, branch, error)));
    }),
  ),
);

export const pull = RepositoryOperation.Pull.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, repository, path, branch }) {
      const { db } = yield* Database.Service;
      const [loadedSandbox, loadedRepository] = yield* Effect.all([Database.load(sandbox), Database.load(repository)]);
      const repositoryService = yield* RepositoryService.Service;
      return yield* repositoryService
        .pull(db.spaceId, loadedSandbox.id, { repositoryId: loadedRepository.id, path, branch })
        .pipe(Effect.catch((error) => failure(loadedRepository.id, branch, error)));
    }),
  ),
);
