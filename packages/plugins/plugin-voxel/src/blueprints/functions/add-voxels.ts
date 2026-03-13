//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Voxel } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/voxel/add-voxels',
  name: 'Add voxels',
  description: 'Adds one or more voxels to the world at specified coordinates with a given hue.',
  inputSchema: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to modify.',
    }),
    voxels: Schema.Array(
      Schema.Struct({
        x: Schema.Number.annotations({ description: 'X coordinate.' }),
        y: Schema.Number.annotations({ description: 'Y coordinate.' }),
        z: Schema.Number.annotations({ description: 'Z coordinate (height).' }),
        hue: Schema.String.annotations({ description: 'Chromatic hue name (e.g., blue, red, green).' }),
      }),
    ).annotations({
      description: 'Array of voxels to add.',
    }),
  }),
  outputSchema: Schema.Struct({
    added: Schema.Number.annotations({ description: 'Number of voxels added.' }),
  }),
  handler: Effect.fn(function* ({ data: { world, voxels } }) {
    const loaded = yield* Database.load(world);
    let added = 0;
    Obj.change(loaded, (obj) => {
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
});
