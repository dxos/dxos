//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DrawingOperation } from '#types';
import { resolveVariant, scoreScene } from '#util';

const handler: Operation.WithHandler<typeof DrawingOperation.Score> = DrawingOperation.Score.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      const { overall, scores, diagnostics } = scoreScene(variant.builder.read(canvas).scene.objects);
      return {
        ...(overall === undefined ? {} : { overall }),
        scores: scores.map(({ id, kind, score, detail }) => ({ id, kind, score, ...(detail ? { detail } : {}) })),
        diagnostics,
      };
    }),
  ),
);

export default handler;
