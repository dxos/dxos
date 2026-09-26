//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database } from '@dxos/echo';
// Imported so TypeScript can name this type in the emitted .d.ts (UploadFile → File).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type File } from '@dxos/types';

import { SandboxOperation } from '#types';

import { resolveSandboxBackend } from '../../services/resolve-backend.ts';

export default SandboxOperation.UploadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, file, path }) {
      const { db } = yield* Database.Service;

      const loadedSandbox = yield* Database.load(sandbox);
      const loadedFile = yield* Database.load(file);
      const blob = yield* Database.load(loadedFile.data);

      const bytes = yield* Blob.read(blob);
      const sandboxId = loadedSandbox.id;
      const spaceId = db.spaceId;
      const backend = yield* resolveSandboxBackend.pipe(Effect.orDie);

      yield* backend.writeFile(spaceId, sandboxId, path, bytes).pipe(Effect.orDie);

      return { path };
    }),
  ),
);
