//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DrawingOperation } from '#types';

import { resolveVariant } from '../util/load-drawing.ts';

const handler: Operation.WithHandler<typeof DrawingOperation.Edit> = DrawingOperation.Edit.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, commands }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      const { upserted, removed } = variant.builder.apply(canvas, commands);
      const { scene, unmanaged } = variant.builder.read(canvas);
      return { scene, unmanaged, upserted, removed };
    }),
  ),
);

export default handler;
