//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { patchSource } from '@dxos/react-ui-canvas/headless';

import { Canvas, CanvasOperation } from '#types';

import { canvasSource } from '../model/layout-source.ts';
import { LegacyCanvasError } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.Patch> = CanvasOperation.Patch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ canvas: ref, from, to, paths }) {
      const canvas = yield* Database.load(ref);
      if (!Canvas.isCanvas(canvas)) {
        // Every edit is made on a scene canvas (`Apply` migrates a legacy one first), so no undo step names a legacy one.
        return yield* Effect.fail(new LegacyCanvasError({ message: `Canvas ${canvas.id} is not a scene canvas.` }));
      }
      return { canvas: canvas.id, ...patchSource(canvasSource(canvas), { from, to, paths }) };
    }),
  ),
);

export default handler;
