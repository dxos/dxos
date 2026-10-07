//
// Copyright 2026 DXOS.org
//

/* eslint-disable react/no-unknown-property */

import { Voxel } from '#types';

import { type VoxelBounds } from './VoxelEditor.tsx';

// Kept out of `VoxelEditor.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Compute bounding box center and a camera position that frames all voxels. */
export const toThree = (x: number, y: number, z: number, blockSize = 1): [number, number, number] => [
  x * blockSize,
  z * blockSize,
  y * blockSize,
];

export const computeVoxelBounds = (voxels: Voxel.VoxelData[], blockSize = 1, padding = 1.5): VoxelBounds => {
  if (voxels.length === 0) {
    return { center: [0, 0, 0], cameraPosition: [4, 3, 4] };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const voxel of voxels) {
    // Compute bounds in Three.js space.
    const [tx, ty, tz] = toThree(voxel.x, voxel.y, voxel.z);
    minX = Math.min(minX, tx);
    minY = Math.min(minY, ty);
    minZ = Math.min(minZ, tz);
    maxX = Math.max(maxX, tx);
    maxY = Math.max(maxY, ty);
    maxZ = Math.max(maxZ, tz);
  }

  const centerX = ((minX + maxX) / 2) * blockSize;
  const centerY = ((minY + maxY) / 2) * blockSize;
  const centerZ = ((minZ + maxZ) / 2) * blockSize;

  const sizeX = (maxX - minX + 1) * blockSize;
  const sizeY = (maxY - minY + 1) * blockSize;
  const sizeZ = (maxZ - minZ + 1) * blockSize;
  const maxSize = Math.max(sizeX, sizeY, sizeZ);
  const distance = maxSize * padding;

  return {
    center: [centerX, centerY, centerZ],
    cameraPosition: [centerX + distance, centerY + distance * 0.7, centerZ + distance],
  };
};
