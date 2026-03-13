//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { generateModel, type ModelType, MODEL_TYPES } from '../../models';
import { Voxel } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/voxel/generate-shape',
  name: 'Generate shape',
  description: `Generates a 3D shape made of voxels at the given origin. Available shapes: ${MODEL_TYPES.join(', ')}.`,
  inputSchema: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to modify.',
    }),
    shape: (
      Schema.Union(...MODEL_TYPES.map((type) => Schema.Literal(type))) as unknown as Schema.Schema<ModelType>
    ).annotations({
      description: `Shape type: ${MODEL_TYPES.join(', ')}.`,
    }),
    origin: Schema.Struct({
      x: Schema.Number.annotations({ description: 'X coordinate of the origin.' }),
      y: Schema.Number.annotations({ description: 'Y coordinate of the origin.' }),
      z: Schema.Number.annotations({ description: 'Z coordinate of the origin.' }),
    }).annotations({
      description: 'Origin point for the shape.',
    }),
    hue: Schema.String.annotations({
      description: 'Chromatic hue name (e.g., blue, red, green).',
    }),
  }),
  outputSchema: Schema.Struct({
    added: Schema.Number.annotations({ description: 'Number of voxels added.' }),
  }),
  handler: Effect.fn(function* ({ data: { world, shape, origin, hue } }) {
    const loaded = yield* Database.load(world);
    const voxels = generateModel(shape, origin, hue);
    let added = 0;
    Obj.change(loaded, (obj) => {
      if (!obj.voxels) {
        (obj as any).voxels = {};
      }
      for (const voxel of voxels) {
        const key = Voxel.voxelKey(voxel.x, voxel.y, voxel.z);
        obj.voxels![key] = { hue: voxel.hue };
        added++;
      }
    });
    return { added };
  }),
});
