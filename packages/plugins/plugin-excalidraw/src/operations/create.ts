//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { Excalidraw, ExcalidrawOperation } from '#types';

const handler: Operation.WithHandler<typeof ExcalidrawOperation.Create> = ExcalidrawOperation.Create.pipe(
  Operation.withHandler(({ name, schema = Excalidraw.EXCALIDRAW_SCHEMA, content = {} }) =>
    Effect.succeed({
      object: Excalidraw.make({ name, canvas: { schema, content } }),
    }),
  ),
);

export default handler;
