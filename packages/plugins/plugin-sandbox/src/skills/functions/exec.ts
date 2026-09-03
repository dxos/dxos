//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SandboxOperation } from '#types';

import { mergeExecEnv } from '../../services/sandbox-env.ts';
import { createSandboxClient } from '../../services/sandbox-url.ts';

export default SandboxOperation.Exec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, command, cwd, env, timeout }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loaded = yield* Database.load(sandbox);
      const sandboxId = loaded.id;
      const spaceId = db.spaceId;
      const sandboxClient = createSandboxClient(client);
      const mergedEnv = yield* mergeExecEnv(loaded.credentials, env);

      const result = yield* Effect.promise(() =>
        sandboxClient.exec(spaceId, sandboxId, { command, cwd, env: mergedEnv, timeout }),
      );

      return result;
    }),
  ),
);
