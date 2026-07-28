//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SketchOperation } from '../types';
import { resolveVariant } from '../util/load-sketch';

const handler: Operation.WithHandler<typeof SketchOperation.Edit> = SketchOperation.Edit.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sketch, commands }) {
      const { canvas, variant } = yield* resolveVariant(sketch);
      const { upserted, removed } = variant.builder.apply(canvas, commands);
      const { scene, unmanaged } = variant.builder.read(canvas);
      return { scene, unmanaged, upserted, removed };
    }),
  ),
);

export default handler;
