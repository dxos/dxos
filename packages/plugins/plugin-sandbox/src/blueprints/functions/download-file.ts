//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { CollectionModel } from '@dxos/schema';
import { File } from '@dxos/types';

import { SandboxClient } from '../../services/SandboxClient';
import { DownloadFile } from './definitions';

export default DownloadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, path, dest }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loadedSandbox = yield* Database.load(sandbox);
      const sandboxId = loadedSandbox.id;
      const spaceId = db.spaceId;
      const edgeUrl = client.config.values.runtime?.services?.edge?.url ?? '';
      const sandboxClient = new SandboxClient(edgeUrl);

      const content = yield* Effect.promise(() => sandboxClient.readFile(spaceId, sandboxId, path));

      const bytes = new TextEncoder().encode(content);
      const fileName = path.split('/').at(-1) ?? path;

      if (dest) {
        const loadedDest = yield* Database.load(dest);
        Obj.update(loadedDest, (loadedDest) => {
          loadedDest.name = fileName;
          loadedDest.size = bytes.byteLength;
          loadedDest.data = File.inlineData(bytes);
          loadedDest.timestamp = new Date().toISOString();
        });
        return { objectId: Obj.getURI(loadedDest) };
      }

      const fileObj = File.make({
        name: fileName,
        type: 'text/plain',
        size: bytes.byteLength,
        data: File.inlineData(bytes),
        timestamp: new Date().toISOString(),
      });
      yield* CollectionModel.add({ object: fileObj });

      return { objectId: Obj.getURI(fileObj) };
    }),
  ),
);
