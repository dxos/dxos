//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { SandboxClient } from '../../services/SandboxClient';
import * as Sandbox from '../../types/Sandbox';
import { CreateSandbox } from './definitions';

export default CreateSandbox.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, baseImage }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const sandbox = Sandbox.make({ name, baseImage });
      yield* CollectionModel.add({ object: sandbox });

      const sandboxId = sandbox.id;
      const spaceId = db.spaceId;
      const edgeUrl = client.config.values.runtime?.services?.edge?.url ?? '';
      const sandboxClient = new SandboxClient(edgeUrl);

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
