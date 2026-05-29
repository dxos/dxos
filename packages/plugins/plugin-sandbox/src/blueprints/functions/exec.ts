//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { SandboxClient } from '../../services/SandboxClient';
import { Exec } from './definitions';

export default Exec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, command, cwd, env, timeout, stdin }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loaded = yield* Database.load(sandbox);
      const sandboxId = loaded.id;
      const spaceId = db.spaceId;
      const edgeUrl = client.config.values.runtime?.services?.edge?.url ?? '';
      const sandboxClient = new SandboxClient(edgeUrl);

      const result = yield* Effect.promise(() =>
        sandboxClient.exec(spaceId, sandboxId, { command, cwd, env, timeout, stdin }),
      );

      return result;
    }),
  ),
);
