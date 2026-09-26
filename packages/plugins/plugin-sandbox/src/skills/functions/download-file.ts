//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as DefaultParent from '@dxos/app-toolkit/DefaultParent';
import * as Operation from '@dxos/compute/Operation';
import { Blob, Database, Obj, Ref } from '@dxos/echo';
import { File } from '@dxos/types';

import { SandboxOperation } from '#types';

import { resolveSandboxBackend } from '../../services/resolve-backend.ts';

export default SandboxOperation.DownloadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, path, dest }) {
      const { db } = yield* Database.Service;

      const loadedSandbox = yield* Database.load(sandbox);
      const sandboxId = loadedSandbox.id;
      const spaceId = db.spaceId;
      const backend = yield* resolveSandboxBackend.pipe(Effect.orDie);

      const { bytes, type } = yield* backend.readFileBytes(spaceId, sandboxId, path).pipe(Effect.orDie);
      const fileName = path.split('/').at(-1) ?? path;

      if (dest) {
        const loadedDest = yield* Database.load(dest);
        const blob = yield* Blob.fromBytes(bytes, { type });
        Obj.setParent(blob, loadedDest);
        yield* Database.add(blob);
        Obj.update(loadedDest, (loadedDest) => {
          loadedDest.name = fileName;
          loadedDest.data = Ref.make(blob);
          loadedDest.timestamp = new Date().toISOString();
        });
        return { objectId: Obj.getURI(loadedDest) };
      }

      const fileObj = yield* File.fromBytes(bytes, { name: fileName, type });
      yield* DefaultParent.add({ object: fileObj });

      return { objectId: Obj.getURI(fileObj) };
    }),
  ),
);
