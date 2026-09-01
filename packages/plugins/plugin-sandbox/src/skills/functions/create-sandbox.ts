//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Sandbox, SandboxOperation } from '#types';

import { createSandboxClient } from '../../services/sandbox-url.ts';

export default SandboxOperation.CreateSandbox.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, baseImage }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const sandbox = Sandbox.make({ name, baseImage });
      yield* Database.add(sandbox);

      const sandboxId = sandbox.id;
      const spaceId = db.spaceId;
      const sandboxClient = createSandboxClient(client);

      const record = yield* Effect.promise(() => sandboxClient.createSandbox(spaceId, sandboxId, { name, baseImage }));

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
