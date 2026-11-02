//
// Copyright 2026 DXOS.org
//

import type * as Voxel from '@dxos/plugin-voxel/Voxel';

// Voxel axes follow plugin-voxel: x right, y forward, z up.

export type Vec = { readonly x: number; readonly y: number; readonly z: number };

/** Picks a hue per cell, so one box can be mottled or patterned. */
export type HueFn = (x: number, y: number, z: number) => string;

export type BoxOptions = {
  /** Only the outer shell: the inside of a solid model is never seen, and every voxel is a mesh. */
  readonly hollow?: boolean;
};

const hueFn = (hue: string | HueFn): HueFn => (typeof hue === 'string' ? () => hue : hue);

/** A box of `size` voxels whose minimum corner is `origin`. */
export const box = (
  origin: Vec,
  size: Vec,
  hue: string | HueFn,
  { hollow = false }: BoxOptions = {},
): Voxel.VoxelData[] => {
  const pick = hueFn(hue);
  const voxels: Voxel.VoxelData[] = [];
  for (let dx = 0; dx < size.x; dx++) {
    for (let dy = 0; dy < size.y; dy++) {
      for (let dz = 0; dz < size.z; dz++) {
        const inside = dx > 0 && dx < size.x - 1 && dy > 0 && dy < size.y - 1 && dz > 0 && dz < size.z - 1;
        if (hollow && inside) {
          continue;
        }
        const x = origin.x + dx;
        const y = origin.y + dy;
        const z = origin.z + dz;
        voxels.push({ x, y, z, hue: pick(x, y, z) });
      }
    }
  }
  return voxels;
};

/** Deterministic per-cell choice from `hues`, giving Minecraft's speckled texture without randomness. */
export const mottle =
  (hues: ReadonlyArray<string>): HueFn =>
  (x, y, z) => {
    const hash = Math.abs((x * 73_856_093) ^ (y * 19_349_663) ^ (z * 83_492_791));
    return hues[hash % hues.length];
  };

/** Moves voxels by `offset`. */
export const translate = (voxels: ReadonlyArray<Voxel.VoxelData>, offset: Vec): Voxel.VoxelData[] =>
  voxels.map((voxel) => ({ ...voxel, x: voxel.x + offset.x, y: voxel.y + offset.y, z: voxel.z + offset.z }));

/** Unions layers into one model; a later layer repaints any cell an earlier one filled. */
export const merge = (...layers: ReadonlyArray<ReadonlyArray<Voxel.VoxelData>>): Voxel.VoxelData[] => {
  const cells = new Map<string, Voxel.VoxelData>();
  for (const layer of layers) {
    for (const voxel of layer) {
      cells.set(`${voxel.x}:${voxel.y}:${voxel.z}`, voxel);
    }
  }
  return [...cells.values()];
};
