//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import * as Voxel from '../types/Voxel';
import * as VoxelOperation from '../types/VoxelOperation';

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
