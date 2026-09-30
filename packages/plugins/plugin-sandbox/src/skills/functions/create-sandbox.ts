//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Sandbox, SandboxOperation, SandboxService } from '#types';

import { resolveAttachments } from '../../services/attach-repositories.ts';

export default SandboxOperation.CreateSandbox.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, baseImage, repositories = [] }) {
      const { db } = yield* Database.Service;
      const sandboxService = yield* SandboxService.Service;
      // Refused before anything is made: a local sandbox would be created with the repositories on
      // the object but none of them attached.
      if (repositories.length > 0 && sandboxService.kind !== 'edge') {
        return yield* Effect.die(
          new SandboxService.SandboxError({ message: 'Repositories can be attached only to EDGE sandboxes.' }),
        );
      }

      const sandbox = Sandbox.make({ name, baseImage, repositories: [...repositories] });
      yield* Database.add(sandbox);

      const sandboxId = sandbox.id;
      const spaceId = db.spaceId;

      const attached = yield* resolveAttachments(spaceId, repositories).pipe(Effect.orDie);
      const record = yield* sandboxService
        .create(spaceId, sandboxId, { name, baseImage, repositories: attached })
        .pipe(Effect.orDie);

      Obj.update(sandbox, (sandbox) => {
        sandbox.createdAt = record.createdAt;
        sandbox.expiresAt = record.expiresAt;
        if (record.baseImage) {
          sandbox.baseImage = record.baseImage;
        }
      });

      return { sandboxId: Obj.getURI(sandbox) };
    }),
  ),
);
