//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { Diagnostics, MermaidEngine, Uml } from '#model';
import { DrawingOperation } from '#types';
import { resolveVariant } from '#util';

const handler: Operation.WithHandler<typeof DrawingOperation.Generate> = DrawingOperation.Generate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, source }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      // ELK is promise-based; the platform boundary sits here.
      const commands = Uml.isClassDiagram(source)
        ? Uml.compile(source)
        : yield* Effect.promise(() => MermaidEngine.compile(source));
      const { upserted } = variant.builder.apply(canvas, commands);
      const { scene, unmanaged } = variant.builder.read(canvas);
      // The report closes the agent's loop: it can see an illegible result and regenerate.
      const { diagnostics } = Diagnostics.analyze(scene.objects);
      return { scene, unmanaged, upserted, diagnostics };
    }),
  ),
);

export default handler;
