//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Voxel } from '../../types';

import { AddVoxels } from './definitions';

export default AddVoxels.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world, voxels }) {
      const loaded = (yield* Database.load(world)) as Voxel.World;
      let added = 0;
      Obj.change(loaded, (obj) => {
        if (!obj.voxels) {
          obj.voxels = {};
        }
        const voxelMap = obj.voxels as Obj.Mutable<typeof obj.voxels>;
        for (const voxel of voxels) {
          const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
          if (!(key in voxelMap)) {
            voxelMap[key] = { hue: voxel.hue };
            added++;
          }
        }
      });
      return { added };
    }),
  ),
);
