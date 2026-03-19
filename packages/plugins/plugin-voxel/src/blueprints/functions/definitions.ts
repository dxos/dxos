//
// Copyright 2026 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';

import { type ModelType, MODEL_TYPES } from '../../models';
import { Voxel } from '../../types';

const VoxelCoord = Schema.Struct({
  x: Schema.Number.annotations({ description: 'X coordinate.' }),
  y: Schema.Number.annotations({ description: 'Y coordinate.' }),
  z: Schema.Number.annotations({ description: 'Z coordinate (height).' }),
  hue: Schema.String.annotations({ description: 'Chromatic hue name (e.g., blue, red, green).' }),
});

const Position = Schema.Struct({
  x: Schema.Number.annotations({ description: 'X coordinate.' }),
  y: Schema.Number.annotations({ description: 'Y coordinate.' }),
  z: Schema.Number.annotations({ description: 'Z coordinate (height).' }),
});

export const QueryWorld = Operation.make({
  meta: {
    key: 'dxos.org/function/voxel/query-world',
    name: 'Query world',
    description:
      'Returns the current state of the voxel world including all voxels, grid dimensions, and block size.',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to query.',
    }),
  }),
  output: Schema.Struct({
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
  services: [Database.Service],
});

export const AddVoxels = Operation.make({
  meta: {
    key: 'dxos.org/function/voxel/add-voxels',
    name: 'Add voxels',
    description: 'Adds one or more voxels to the world at specified coordinates with a given hue.',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to modify.',
    }),
    voxels: Schema.Array(VoxelCoord).annotations({
      description: 'Array of voxels to add.',
    }),
  }),
  output: Schema.Struct({
    added: Schema.Number.annotations({ description: 'Number of voxels added.' }),
  }),
  services: [Database.Service],
});

export const RemoveVoxels = Operation.make({
  meta: {
    key: 'dxos.org/function/voxel/remove-voxels',
    name: 'Remove voxels',
    description: 'Removes voxels at specified coordinates from the world.',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotations({
      description: 'The voxel world to modify.',
    }),
    positions: Schema.Array(Position).annotations({
      description: 'Array of positions to remove.',
    }),
  }),
  output: Schema.Struct({
    removed: Schema.Number.annotations({ description: 'Number of voxels removed.' }),
  }),
  services: [Database.Service],
});

export const GenerateShape = Operation.make({
  meta: {
    key: 'dxos.org/function/voxel/generate-shape',
    name: 'Generate shape',
    description: `Generates a 3D shape made of voxels at the given origin. Available shapes: ${MODEL_TYPES.join(', ')}.`,
  },
  input: Schema.Struct({
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
  output: Schema.Struct({
    added: Schema.Number.annotations({ description: 'Number of voxels added.' }),
  }),
  services: [Database.Service],
});
