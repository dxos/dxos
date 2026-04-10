//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { generateModel } from '../models';
import { Voxel } from '../types';
import { GenerateShape } from './definitions';

const handler: Operation.WithHandler<typeof GenerateShape> = GenerateShape.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world, shape, origin, hue }) {
      const loaded = (yield* Database.load(world)) as Voxel.World;
      const voxels = generateModel(shape, origin, hue);
      let added = 0;
      Obj.change(loaded, (obj) => {
        if (!obj.voxels) {
          obj.voxels = {};
        }
        const voxelMap = obj.voxels as Obj.Mutable<typeof obj.voxels>;
        for (const voxel of voxels) {
          const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
          voxelMap[key] = { hue: voxel.hue };
          added++;
        }
      });
      return { added };
    }),
  ),
);

export default handler;
