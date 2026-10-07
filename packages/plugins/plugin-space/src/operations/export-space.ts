// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { downloadBlob } from '@dxos/util';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.ExportSpace> = SpaceOperation.ExportSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, format }) {
      yield* Effect.promise(() => space.waitUntilReady());
      const archive = yield* Effect.promise(() => space.internal.export({ format }));
      yield* Effect.promise(() =>
        downloadBlob(new Blob([archive.contents as Uint8Array<ArrayBuffer>]), archive.filename),
      );
    }),
  ),
);
export default handler;
