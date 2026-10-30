//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { patchSource } from '@dxos/react-ui-canvas/headless';

import { Canvas, CanvasOperation } from '#types';

import { canvasSource } from '../model/layout-source.ts';
import { withCanvasStore } from './patch-store.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.Patch> = CanvasOperation.Patch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ canvas: ref, from, to, paths }) {
      const canvas = yield* Database.load(ref);
      if (Canvas.isCanvas(canvas)) {
        return { canvas: canvas.id, ...patchSource(canvasSource(canvas), { from, to, paths }) };
      }
      return yield* withCanvasStore(ref, ({ canvas, versions }) => ({
        canvas: canvas.id,
        ...patchSource(versions, { from, to, paths }),
      }));
    }),
  ),
);

export default handler;
