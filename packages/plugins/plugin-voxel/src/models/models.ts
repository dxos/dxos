//
// Copyright 2026 DXOS.org
//

import { type Voxel } from '../types';

/** Available model types for shape generation. */
export type ModelType = 'cube' | 'wall' | 'sphere' | 'cylinder' | 'tower';

/** All available model types. */
export const MODEL_TYPES: ModelType[] = ['cube', 'wall', 'sphere', 'cylinder', 'tower'];

type Origin = { x: number; y: number; z: number };

/** Generate a solid cube of voxels. */
export const generateCube = (origin: Origin, hue: string, size = 3): Voxel.VoxelData[] => {
  const voxels: Voxel.VoxelData[] = [];
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      for (let dz = 0; dz < size; dz++) {
        voxels.push({ x: origin.x + dx, y: origin.y + dy, z: origin.z + dz, hue });
      }
    }
  }
  return voxels;
};

/** Generate a flat wall of voxels along the x-z plane. */
export const generateWall = (origin: Origin, hue: string, width = 5, height = 4): Voxel.VoxelData[] => {
  const voxels: Voxel.VoxelData[] = [];
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < height; dz++) {
      voxels.push({ x: origin.x + dx, y: origin.y, z: origin.z + dz, hue });
    }
  }
  return voxels;
};

/** Generate a voxelized sphere. */
export const generateSphere = (origin: Origin, hue: string, radius = 3): Voxel.VoxelData[] => {
  const voxels: Voxel.VoxelData[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dy * dy + dz * dz <= radius * radius) {
          voxels.push({ x: origin.x + dx, y: origin.y + dy, z: origin.z + dz, hue });
        }
      }
    }
  }
  return voxels;
};

/** Generate a voxelized cylinder along the z-axis. */
export const generateCylinder = (origin: Origin, hue: string, radius = 2, height = 5): Voxel.VoxelData[] => {
  const voxels: Voxel.VoxelData[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx * dx + dy * dy <= radius * radius) {
        for (let dz = 0; dz < height; dz++) {
          voxels.push({ x: origin.x + dx, y: origin.y + dy, z: origin.z + dz, hue });
        }
      }
    }
  }
  return voxels;
};

/** Generate a tower (1x1 column) of voxels. */
export const generateTower = (origin: Origin, hue: string, height = 5): Voxel.VoxelData[] => {
  const voxels: Voxel.VoxelData[] = [];
  for (let dz = 0; dz < height; dz++) {
    voxels.push({ x: origin.x, y: origin.y, z: origin.z + dz, hue });
  }
  return voxels;
};

/** Generate a model by type with default parameters. */
export const generateModel = (type: ModelType, origin: Origin, hue: string): Voxel.VoxelData[] => {
  switch (type) {
    case 'cube':
      return generateCube(origin, hue);
    case 'wall':
      return generateWall(origin, hue);
    case 'sphere':
      return generateSphere(origin, hue);
    case 'cylinder':
      return generateCylinder(origin, hue);
    case 'tower':
      return generateTower(origin, hue);
  }
};

/** Generate a random model type at the given origin. */
export const generateRandomModel = (origin: Origin, hue: string): { type: ModelType; voxels: Voxel.VoxelData[] } => {
  const type = MODEL_TYPES[Math.floor(Math.random() * MODEL_TYPES.length)];
  return { type, voxels: generateModel(type, origin, hue) };
};
