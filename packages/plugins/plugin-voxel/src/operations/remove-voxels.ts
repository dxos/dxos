//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { Voxel } from '../types';
import { RemoveVoxels } from './definitions';

const handler: Operation.WithHandler<typeof RemoveVoxels> = RemoveVoxels.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world, positions }) {
      const loaded = (yield* Database.load(world)) as Voxel.World;
      let removed = 0;
      Obj.update(loaded, (loaded) => {
        if (loaded.voxels) {
          const voxelMap = loaded.voxels as Obj.Mutable<typeof loaded.voxels>;
          for (const position of positions) {
            const key = Voxel.voxelKey(position.x, position.y, position.z);
            if (key in voxelMap) {
              delete voxelMap[key];
              removed++;
            }
          }
        }
      });
      return { removed };
    }),
  ),
);

export default handler;
