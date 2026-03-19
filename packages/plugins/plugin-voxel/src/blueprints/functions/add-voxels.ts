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
      Obj.change(loaded, (obj: Voxel.World) => {
        if (!obj.voxels) {
          (obj as any).voxels = {};
        }
        for (const voxel of voxels) {
          const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
          if (!(key in obj.voxels!)) {
            obj.voxels![key] = { hue: voxel.hue };
            added++;
          }
        }
      });
      return { added };
    }),
  ),
);
