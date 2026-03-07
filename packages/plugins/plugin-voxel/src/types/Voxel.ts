//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/** Single voxel position and color. */
export const VoxelData = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  z: Schema.Number,
  /** Hex color value (e.g., 0x4488ff). */
  color: Schema.Number,
});

export interface VoxelData extends Schema.Schema.Type<typeof VoxelData> {}

/** A voxel world containing a set of 3D points. */
export const World = Schema.Struct({
  name: Schema.optional(Schema.String),
  /** Grid size defining the world bounds (used as fallback when gridWidth/gridDepth not set). */
  gridSize: Schema.optional(Schema.Number),
  /** Grid width (x-axis). */
  gridWidth: Schema.optional(Schema.Number),
  /** Grid depth (z-axis). */
  gridDepth: Schema.optional(Schema.Number),
  /** Serialized voxel data as JSON string array. */
  voxels: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Voxel',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface World extends Schema.Schema.Type<typeof World> {}

const DEFAULT_GRID_SIZE = 16;

const DEFAULT_VOXELS: VoxelData[] = [];

/** Parse voxels from serialized JSON string. */
export const parseVoxels = (voxelsStr?: string): VoxelData[] => {
  if (!voxelsStr) {
    return DEFAULT_VOXELS;
  }
  try {
    return JSON.parse(voxelsStr) as VoxelData[];
  } catch {
    return DEFAULT_VOXELS;
  }
};

/** Serialize voxels to JSON string. */
export const serializeVoxels = (voxels: VoxelData[]): string => {
  return JSON.stringify(voxels);
};

/** Get grid dimensions from a world object. */
export const getGridDimensions = (world: World): { gridWidth: number; gridDepth: number } => {
  return {
    gridWidth: world.gridWidth ?? world.gridSize ?? DEFAULT_GRID_SIZE,
    gridDepth: world.gridDepth ?? world.gridSize ?? DEFAULT_GRID_SIZE,
  };
};

export const make = ({
  name,
  gridSize,
  gridWidth,
  gridDepth,
  voxels,
}: {
  name?: string;
  gridSize?: number;
  gridWidth?: number;
  gridDepth?: number;
  voxels?: VoxelData[];
} = {}) => {
  return Obj.make(World, {
    name,
    gridSize: gridSize ?? DEFAULT_GRID_SIZE,
    gridWidth: gridWidth ?? gridSize ?? DEFAULT_GRID_SIZE,
    gridDepth: gridDepth ?? gridSize ?? DEFAULT_GRID_SIZE,
    voxels: serializeVoxels(voxels ?? DEFAULT_VOXELS),
  });
};
