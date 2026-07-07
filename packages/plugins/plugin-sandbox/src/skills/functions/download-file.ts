//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Blob, Database, Obj, Ref } from '@dxos/echo';
import { File } from '@dxos/types';

import { createSandboxClient } from '../../services/sandbox-url';
import { DownloadFile } from './definitions';

export default DownloadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, path, dest }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loadedSandbox = yield* Database.load(sandbox);
      const sandboxId = loadedSandbox.id;
      const spaceId = db.spaceId;
      const sandboxClient = createSandboxClient(client);

      const content = yield* Effect.promise(() => sandboxClient.readFile(spaceId, sandboxId, path));

      const bytes = new TextEncoder().encode(content);
      const fileName = path.split('/').at(-1) ?? path;

      if (dest) {
        const loadedDest = yield* Database.load(dest);
        const blob = yield* Blob.fromBytes(bytes, { type: 'text/plain' });
        Obj.setParent(blob, loadedDest);
        yield* Database.add(blob);
        Obj.update(loadedDest, (loadedDest) => {
          loadedDest.name = fileName;
          loadedDest.size = blob.size;
          loadedDest.data = Ref.make(blob);
          loadedDest.timestamp = new Date().toISOString();
        });
        return { objectId: Obj.getURI(loadedDest) };
      }

      const fileObj = yield* File.fromBytes(bytes, { name: fileName, type: 'text/plain' });
      yield* CollectionModel.add({ object: fileObj });

      return { objectId: Obj.getURI(fileObj) };
    }),
  ),
);
