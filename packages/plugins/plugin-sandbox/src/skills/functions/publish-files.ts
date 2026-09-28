//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SandboxOperation, SandboxService } from '#types';

export default SandboxOperation.PublishFiles.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, path }) {
      const { db } = yield* Database.Service;
      const loaded = yield* Database.load(sandbox);
      const sandboxService = yield* SandboxService.Service;
      if (!sandboxService.publish) {
        return { url: '', error: 'this sandbox backend cannot publish files' };
      }

      // Reported in the output rather than raised: `Operation.make` has no error channel, and a reason the
      // model can read (EDGE backend, not a directory) is what it can act on.
      return yield* sandboxService.publish(db.spaceId, loaded.id, path).pipe(
        Effect.map((url) => ({ url })),
        Effect.catch((error) => Effect.succeed({ url: '', error: error.message })),
      );
    }),
  ),
);
