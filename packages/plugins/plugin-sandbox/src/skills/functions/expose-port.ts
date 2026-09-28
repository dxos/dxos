//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SandboxOperation, SandboxService } from '#types';

export default SandboxOperation.ExposePort.pipe(
  Operation.withHandler(
    Effect.fn('SandboxExposePort')(function* ({ sandbox, port }) {
      const { db } = yield* Database.Service;
      const loaded = yield* Database.load(sandbox);
      const sandboxService = yield* SandboxService.Service;
      const { url } = yield* sandboxService.exposePort(db.spaceId, loaded.id, port).pipe(Effect.orDie);
      return { url };
    }),
  ),
);
