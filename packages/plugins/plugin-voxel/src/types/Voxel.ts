//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/** Properties stored for each voxel. */
export const VoxelProps = Schema.Struct({
  /** Chromatic hue name (e.g., 'blue', 'red'). */
  hue: Schema.String,
});

export interface VoxelProps extends Schema.Schema.Type<typeof VoxelProps> {}

/** Single voxel position and properties (used as the in-memory representation). */
export type VoxelData = {
  x: number;
  y: number;
  z: number;
} & VoxelProps;

/** Map of voxel coordinates to voxel properties. Keys are `${x}-${y}-${z}`. */
export type VoxelMap = Record<string, VoxelProps>;

/** A voxel world containing a set of 3D points. */
export const World = Schema.Struct({
  name: Schema.optional(Schema.String),
  /** Grid size defining the world bounds (used as fallback when gridWidth/gridDepth not set). */
  gridSize: Schema.optional(Schema.Number),
  /** Grid width (x-axis). */
  gridWidth: Schema.optional(Schema.Number),
  /** Grid depth (z-axis). */
  gridDepth: Schema.optional(Schema.Number),
  /** Size of each voxel block (default 1). */
  blockSize: Schema.optional(Schema.Number),
  /** Map of voxel coordinates to voxel properties. Keys are `${x}-${y}-${z}`. */
  voxels: Schema.optional(Schema.Record({ key: Schema.String, value: VoxelProps })),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Voxel',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface World extends Schema.Schema.Type<typeof World> {}

const DEFAULT_GRID_SIZE = 16;
const DEFAULT_BLOCK_SIZE = 1;

/** Create a voxel map key from coordinates. */
export const voxelKey = (x: number, y: number, z: number): string => `${x}-${y}-${z}`;

/** Parse a voxel map key into coordinates. */
export const parseVoxelKey = (key: string): { x: number; y: number; z: number } => {
  const [x, y, z] = key.split('-').map(Number);
  return { x, y, z };
};

/** Convert a voxel map to an array of VoxelData. */
export const toVoxelArray = (voxelMap?: VoxelMap): VoxelData[] => {
  if (!voxelMap) {
    return [];
  }
  return Object.entries(voxelMap).map(([key, props]) => ({
    ...parseVoxelKey(key),
    hue: props.hue,
  }));
};

/** Convert an array of VoxelData to a voxel map. */
export const toVoxelMap = (voxels: VoxelData[]): VoxelMap => {
  const map: VoxelMap = {};
  for (const voxel of voxels) {
    map[voxelKey(voxel.x, voxel.y, voxel.z)] = { hue: voxel.hue };
  }
  return map;
};

/** Get grid dimensions and block size from a world object. */
export const getGridDimensions = (world: World): { gridWidth: number; gridDepth: number; blockSize: number } => {
  return {
    gridWidth: world.gridWidth ?? world.gridSize ?? DEFAULT_GRID_SIZE,
    gridDepth: world.gridDepth ?? world.gridSize ?? DEFAULT_GRID_SIZE,
    blockSize: world.blockSize ?? DEFAULT_BLOCK_SIZE,
  };
};

export const make = ({
  name,
  gridSize,
  gridWidth,
  gridDepth,
  blockSize,
  voxels,
}: {
  name?: string;
  gridSize?: number;
  gridWidth?: number;
  gridDepth?: number;
  blockSize?: number;
  voxels?: VoxelData[];
} = {}) => {
  return Obj.make(World, {
    name,
    gridSize: gridSize ?? DEFAULT_GRID_SIZE,
    gridWidth: gridWidth ?? gridSize ?? DEFAULT_GRID_SIZE,
    gridDepth: gridDepth ?? gridSize ?? DEFAULT_GRID_SIZE,
    blockSize: blockSize ?? DEFAULT_BLOCK_SIZE,
    voxels: voxels ? (toVoxelMap(voxels) as any) : {},
  });
};
