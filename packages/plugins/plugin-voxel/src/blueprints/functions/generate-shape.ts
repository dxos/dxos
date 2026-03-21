//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { generateModel } from '../../models';
import { Voxel } from '../../types';

import { GenerateShape } from './definitions';

export default GenerateShape.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world, shape, origin, hue }) {
      const loaded = (yield* Database.load(world)) as Voxel.World;
      const voxels = generateModel(shape, origin, hue);
      let added = 0;
      Obj.change(loaded, (loaded) => {
        if (!loaded.voxels) {
          loaded.voxels = {};
        }
        const voxelMap = loaded.voxels as Obj.Mutable<typeof loaded.voxels>;
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
