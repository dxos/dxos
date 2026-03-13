//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Voxel } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/voxel/query-world',
  name: 'Query world',
  description: 'Returns the current state of the voxel world including all voxels, grid dimensions, and block size.',
  inputSchema: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to query.',
    }),
  }),
  outputSchema: Schema.Struct({
    gridX: Schema.Number,
    gridY: Schema.Number,
    blockSize: Schema.Number,
    voxelCount: Schema.Number,
    voxels: Schema.Array(
      Schema.Struct({
        x: Schema.Number,
        y: Schema.Number,
        z: Schema.Number,
        hue: Schema.String,
      }),
    ),
  }),
  handler: Effect.fn(function* ({ data: { world } }) {
    const loaded = yield* Database.load(world);
    const { gridX, gridY, blockSize } = Voxel.getGridDimensions(loaded);
    const voxels = Voxel.toVoxelArray(loaded.voxels);
    return {
      gridX,
      gridY,
      blockSize,
      voxelCount: voxels.length,
      voxels,
    };
  }),
});
