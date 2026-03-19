//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Voxel } from '../../types';

import { RemoveVoxels } from './definitions';

export default RemoveVoxels.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world, positions }) {
      const loaded = (yield* Database.load(world)) as Voxel.World;
      let removed = 0;
      Obj.change(loaded, (obj: Voxel.World) => {
        if (obj.voxels) {
          for (const position of positions) {
            const key = Voxel.voxelKey(position.x, position.y, position.z);
            if (key in obj.voxels) {
              delete obj.voxels[key];
              removed++;
            }
          }
        }
      });
      return { removed };
    }),
  ),
);
