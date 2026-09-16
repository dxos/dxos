//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import { MODEL_TYPES } from '../models/index.ts';
import * as Voxel from './Voxel.ts';

const VoxelCoord = Schema.Struct({
  x: Schema.Number.annotate({ description: 'X coordinate.' }),
  y: Schema.Number.annotate({ description: 'Y coordinate.' }),
  z: Schema.Number.annotate({ description: 'Z coordinate (height).' }),
  hue: Schema.String.annotate({ description: 'Chromatic hue name (e.g., blue, red, green).' }),
});

const Position = Schema.Struct({
  x: Schema.Number.annotate({ description: 'X coordinate.' }),
  y: Schema.Number.annotate({ description: 'Y coordinate.' }),
  z: Schema.Number.annotate({ description: 'Z coordinate (height).' }),
});

export const QueryWorld = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.voxel.queryWorld'),
    name: 'Query world',
    description: 'Returns the current state of the voxel world including all voxels, grid dimensions, and block size.',
    icon: 'ph--cube--regular',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotate({
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
    key: DXN.make('org.dxos.operation.voxel.add'),
    name: 'Add voxels',
    description: 'Adds one or more voxels to the world at specified coordinates with a given hue.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotate({
      description: 'The voxel world to modify.',
    }),
    voxels: Schema.Array(VoxelCoord).annotate({
      description: 'Array of voxels to add.',
    }),
  }),
  output: Schema.Struct({
    added: Schema.Number.annotate({ description: 'Number of voxels added.' }),
  }),
  services: [Database.Service],
});

export const RemoveVoxels = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.voxel.remove'),
    name: 'Remove voxels',
    description: 'Removes voxels at specified coordinates from the world.',
    icon: 'ph--minus--regular',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotate({
      description: 'The voxel world to modify.',
    }),
    positions: Schema.Array(Position).annotate({
      description: 'Array of positions to remove.',
    }),
  }),
  output: Schema.Struct({
    removed: Schema.Number.annotate({ description: 'Number of voxels removed.' }),
  }),
  services: [Database.Service],
});

export const GenerateShape = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.voxel.generateShape'),
    name: 'Generate shape',
    description: `Generates a 3D shape made of voxels at the given origin. Available shapes: ${MODEL_TYPES.join(', ')}.`,
    icon: 'ph--cube--regular',
  },
  input: Schema.Struct({
    world: Ref.Ref(Voxel.World).annotate({
      description: 'The voxel world to modify.',
    }),
    shape: Schema.Literals(MODEL_TYPES).annotate({
      description: `Shape type: ${MODEL_TYPES.join(', ')}.`,
    }),
    origin: Schema.Struct({
      x: Schema.Number.annotate({ description: 'X coordinate of the origin.' }),
      y: Schema.Number.annotate({ description: 'Y coordinate of the origin.' }),
      z: Schema.Number.annotate({ description: 'Z coordinate of the origin.' }),
    }).annotate({
      description: 'Origin point for the shape.',
    }),
    hue: Schema.String.annotate({
      description: 'Chromatic hue name (e.g., blue, red, green).',
    }),
  }),
  output: Schema.Struct({
    added: Schema.Number.annotate({ description: 'Number of voxels added.' }),
  }),
  services: [Database.Service],
});
