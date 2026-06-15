//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { Sketch, SketchOperation } from '../types';

const handler: Operation.WithHandler<typeof SketchOperation.Create> = SketchOperation.Create.pipe(
  Operation.withHandler(({ name, schema = Sketch.TLDRAW_SCHEMA, content = {} }) =>
    Effect.succeed({
      object: Sketch.make({ name, canvas: { schema, content } }),
    }),
  ),
);

export default handler;
