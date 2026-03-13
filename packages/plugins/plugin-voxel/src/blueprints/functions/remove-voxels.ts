//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Voxel } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/voxel/remove-voxels',
  name: 'Remove voxels',
  description: 'Removes voxels at specified coordinates from the world.',
  inputSchema: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to modify.',
    }),
    positions: Schema.Array(
      Schema.Struct({
        x: Schema.Number.annotations({ description: 'X coordinate.' }),
        y: Schema.Number.annotations({ description: 'Y coordinate.' }),
        z: Schema.Number.annotations({ description: 'Z coordinate (height).' }),
      }),
    ).annotations({
      description: 'Array of positions to remove.',
    }),
  }),
  outputSchema: Schema.Struct({
    removed: Schema.Number.annotations({ description: 'Number of voxels removed.' }),
  }),
  handler: Effect.fn(function* ({ data: { world, positions } }) {
    const loaded = yield* Database.load(world);
    let removed = 0;
    Obj.change(loaded, (obj) => {
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
});
