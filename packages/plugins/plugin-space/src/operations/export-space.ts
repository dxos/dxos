// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.ExportSpace> = SpaceOperation.ExportSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, format }) {
      yield* Effect.promise(() => space.waitUntilReady());
      const archive = yield* Effect.promise(() => space.internal.export({ format }));
      yield* Effect.sync(() => {
        downloadArchive(new Blob([archive.contents as Uint8Array<ArrayBuffer>]), archive.filename);
      });
    }),
  ),
);
export default handler;

const downloadArchive = (data: Blob, filename: string): void => {
  const url = URL.createObjectURL(data);
  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', filename);
  element.setAttribute('target', 'download');
  element.click();
  URL.revokeObjectURL(url);
};
