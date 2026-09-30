//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { SandboxOperation, SandboxService } from '#types';

import { resolveAttachments } from '../../services/attach-repositories.ts';

/**
 * Adds the repository to the sandbox's configuration, on the object and on EDGE, which then gives
 * every later command in the sandbox the repository as a git remote. Attaching one already attached
 * changes nothing and answers the remote it already has.
 */
export default SandboxOperation.AttachRepository.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox: sandboxRef, repository }) {
      const { db } = yield* Database.Service;
      const sandbox = yield* Database.load(sandboxRef);
      const loadedRepository = yield* Database.load(repository);

      const current = sandbox.repositories ?? [];
      const attached = yield* resolveAttachments(db.spaceId, [...current, repository]).pipe(Effect.orDie);
      const added = attached.length > current.length;
      const sandboxService = yield* SandboxService.Service;
      yield* sandboxService.setRepositories
        ? sandboxService.setRepositories(db.spaceId, sandbox.id, attached).pipe(Effect.orDie)
        : Effect.die(
            new SandboxService.SandboxError({ message: 'Repositories can be attached only to EDGE sandboxes.' }),
          );

      if (added) {
        Obj.update(sandbox, (sandbox) => {
          sandbox.repositories = [...current, repository];
        });
      }

      const remote = attached.find(({ id }) => id === loadedRepository.id)?.name ?? '';
      return { remote };
    }),
  ),
);
