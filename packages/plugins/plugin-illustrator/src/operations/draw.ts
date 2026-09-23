//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Diagnostics, Dsl } from '@dxos/diagram';

import { DrawingOperation } from '#types';

import { resolveVariant } from '../util/load-drawing.ts';

/** 1-based line/column for an offset, so a problem names a place the agent can find in its own source. */
const locate = (text: string, offset: number): { line: number; column: number } => {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  return { line, column: offset - (before.lastIndexOf('\n') + 1) + 1 };
};

const handler: Operation.WithHandler<typeof DrawingOperation.Draw> = DrawingOperation.Draw.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, source }) {
      const { canvas, variant } = yield* resolveVariant(drawing);
      // Parse reports rather than throws, so a source with one bad line still draws the rest and
      // the agent gets both halves of the story: what failed to parse, and how the rest looks.
      const { commands, problems } = Dsl.parse(source);
      const { upserted, removed } = variant.builder.apply(canvas, commands);
      const { scene, unmanaged } = variant.builder.read(canvas);
      const { diagnostics } = Diagnostics.analyze(scene.objects);
      return {
        scene,
        unmanaged,
        upserted,
        removed,
        problems: problems.map(({ severity, message, from }) => ({ severity, message, ...locate(source, from) })),
        diagnostics,
      };
    }),
  ),
);

export default handler;
