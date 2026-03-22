//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Voxel } from '../types';

import { QueryWorld } from './definitions';

const handler: Operation.WithHandler<typeof QueryWorld> = QueryWorld.pipe(
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
