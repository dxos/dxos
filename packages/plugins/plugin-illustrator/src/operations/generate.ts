//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { Mermaid, Uml } from '#model';
import { DrawingOperation } from '#types';
import { resolveVariant } from '#util';

const handler: Operation.WithHandler<typeof DrawingOperation.Generate> = DrawingOperation.Generate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, source }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      const compile = Uml.isClassDiagram(source) ? Uml.compile : Mermaid.compile;
      const { upserted } = variant.builder.apply(canvas, compile(source));
      const { scene, unmanaged } = variant.builder.read(canvas);
      return { scene, unmanaged, upserted };
    }),
  ),
);

export default handler;
