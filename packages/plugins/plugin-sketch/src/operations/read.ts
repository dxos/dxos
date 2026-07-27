//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { readScene } from '#model';

import { SketchOperation } from '../types';

const handler: Operation.WithHandler<typeof SketchOperation.Read> = SketchOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sketch }) {
      const object = yield* Database.load(sketch);
      const canvas = yield* Database.load(object.canvas);
      return readScene(canvas.content);
    }),
  ),
);

export default handler;
