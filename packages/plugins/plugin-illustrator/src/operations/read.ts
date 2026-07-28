//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SketchOperation } from '../types';
import { resolveVariant } from '../util/load-sketch';

const handler: Operation.WithHandler<typeof SketchOperation.Read> = SketchOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sketch }) {
      const { canvas, variant } = yield* resolveVariant(sketch);
      return variant.builder.read(canvas);
    }),
  ),
);

export default handler;
