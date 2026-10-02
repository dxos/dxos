//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SandboxOperation, SandboxService } from '#types';

export default SandboxOperation.OpenTerminal.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, cols, rows }) {
      const { db } = yield* Database.Service;
      const loaded = yield* Database.load(sandbox);
      const sandboxService = yield* SandboxService.Service;
      if (!sandboxService.terminal) {
        return yield* Effect.die(new SandboxService.SandboxError({ message: 'Sandbox backend has no terminal.' }));
      }

      // Idempotent: answers the existing sandbox, and re-creates one the service no longer has — the
      // object outlives the service's record of it.
      yield* sandboxService.create(db.spaceId, loaded.id, { name: loaded.name }).pipe(Effect.orDie);
      return yield* sandboxService.terminal(db.spaceId, loaded.id, { cols, rows }).pipe(Effect.orDie);
    }),
  ),
);
