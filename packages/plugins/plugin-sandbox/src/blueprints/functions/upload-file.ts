//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { SandboxClient } from '../../services/SandboxClient';
import { UploadFile } from './definitions';

export default UploadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, file, path }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loadedSandbox = yield* Database.load(sandbox);
      const loadedFile = yield* Database.load(file);

      const content = fileToString(loadedFile);
      const sandboxId = loadedSandbox.id;
      const spaceId = db.spaceId;
      const edgeUrl = client.config.values.runtime?.services?.edge?.url ?? '';
      const sandboxClient = new SandboxClient(edgeUrl);

      yield* Effect.promise(() => sandboxClient.writeFile(spaceId, sandboxId, path, content));

      return { path };
    }),
  ),
);

const fileToString = (file: { data?: { _tag: string; bytes?: Uint8Array; url?: string } }): string => {
  if (!file.data) {
    return '';
  }
  if (file.data._tag === 'inline' && file.data.bytes) {
    return new TextDecoder().decode(file.data.bytes);
  }
  if (file.data._tag === 'external' && file.data.url) {
    return file.data.url;
  }
  return '';
};
