//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { patchSource } from '@dxos/react-ui-canvas/headless';

import { CanvasOperation } from '#types';

import { canvasSource } from '../model/layout-source.ts';
import { canvasOf } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.Patch> = CanvasOperation.Patch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ canvas: ref, from, to, paths }) {
      const canvas = yield* canvasOf(ref);
      return { canvas: canvas.id, ...patchSource(canvasSource(canvas), { from, to, paths }) };
    }),
  ),
);

export default handler;
