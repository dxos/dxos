//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { Voxel, VoxelOperation } from '../types';

const handler: Operation.WithHandler<typeof VoxelOperation.QueryWorld> = VoxelOperation.QueryWorld.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ world }) {
      const worldObj = (yield* Database.load(world)) as Voxel.World;
      const { gridX, gridY, blockSize } = Voxel.getGridDimensions(worldObj);
      const voxels = Voxel.toVoxelArray(worldObj.voxels);
      return {
        gridX,
        gridY,
        blockSize,
        voxelCount: voxels.length,
        voxels,
      };
    }),
  ),
);

export default handler;
