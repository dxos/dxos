//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { applyCommands, readScene } from '#model';

import { SketchOperation } from '../types';

const handler: Operation.WithHandler<typeof SketchOperation.Edit> = SketchOperation.Edit.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sketch, commands }) {
      const object = yield* Database.load(sketch);
      const canvas = yield* Database.load(object.canvas);
      let upserted: string[] = [];
      let removed = 0;
      Obj.update(canvas, (canvas) => {
        const result = applyCommands(canvas.content as Obj.Mutable<typeof canvas.content>, commands);
        upserted = result.upserted;
        removed = result.removed;
      });
      const { scene, unmanaged } = readScene(canvas.content);
      return { scene, unmanaged, upserted, removed };
    }),
  ),
);

export default handler;
