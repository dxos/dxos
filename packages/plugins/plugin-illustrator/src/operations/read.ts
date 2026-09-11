//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DrawingOperation } from '#types';

import { resolveVariant } from '../util/load-drawing.ts';

const handler: Operation.WithHandler<typeof DrawingOperation.Read> = DrawingOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      return variant.builder.read(canvas);
    }),
  ),
);

export default handler;
