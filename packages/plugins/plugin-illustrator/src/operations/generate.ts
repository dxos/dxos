//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { Mermaid } from '#model';

import { DrawingOperation } from '../types';
import { resolveVariant } from '../util/load-drawing';

const handler: Operation.WithHandler<typeof DrawingOperation.Generate> = DrawingOperation.Generate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, source }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      const { upserted } = variant.builder.apply(canvas, Mermaid.compile(source));
      const { scene, unmanaged } = variant.builder.read(canvas);
      return { scene, unmanaged, upserted };
    }),
  ),
);

export default handler;
