//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
// Imported so TypeScript can name this type in the emitted .d.ts (UploadFile → File).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type File } from '@dxos/types';

import { createSandboxClient } from '../../services/sandbox-url';
import { UploadFile } from './definitions';

export default UploadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, file, path }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loadedSandbox = yield* Database.load(sandbox);
      const loadedFile = yield* Database.load(file);
      const blob = yield* Database.load(loadedFile.data);

      const content = blob.data._tag === 'inline' ? new TextDecoder().decode(blob.data.bytes) : blob.data.uri;
      const sandboxId = loadedSandbox.id;
      const spaceId = db.spaceId;
      const sandboxClient = createSandboxClient(client);

      yield* Effect.promise(() => sandboxClient.writeFile(spaceId, sandboxId, path, content));

      return { path };
    }),
  ),
);
