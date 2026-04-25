//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { Voxel } from '../types';
import { AddVoxels } from './definitions';

const handler: Operation.WithHandler<typeof AddVoxels> = AddVoxels.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world, voxels }) {
      const loaded = (yield* Database.load(world)) as Voxel.World;
      let added = 0;
      Obj.change(loaded, (loaded) => {
        if (!loaded.voxels) {
          loaded.voxels = {};
        }
        const voxelMap = loaded.voxels as Obj.Mutable<typeof loaded.voxels>;
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

export default handler;
