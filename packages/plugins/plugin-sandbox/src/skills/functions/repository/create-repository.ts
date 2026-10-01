//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Repository, RepositoryOperation, RepositoryService } from '#types';

export default RepositoryOperation.CreateRepository.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, defaultBranch }) {
      const { db } = yield* Database.Service;
      const repository = Repository.make({ name, description, defaultBranch });
      yield* Database.add(repository);

      const repositoryService = yield* RepositoryService.Service;
      const record = yield* repositoryService
        .create(db.spaceId, repository.id, { description, defaultBranch })
        .pipe(Effect.orDie);

      Obj.update(repository, (repository) => {
        repository.defaultBranch = record.defaultBranch;
      });

      return { repositoryId: Obj.getURI(repository), remote: record.remote };
    }),
  ),
);
