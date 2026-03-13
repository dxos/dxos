//
// Copyright 2026 DXOS.org
//

import { type Voxel } from '../types';

/**
 * 3D Game of Life simulation operating on a voxel world.
 *
 * Rules (3D variant "5766"):
 * - A live cell survives if it has 5-7 neighbors (out of 26 in 3D Moore neighborhood).
 * - A dead cell is born if it has exactly 6 neighbors.
 *
 * The model reads/writes VoxelData arrays and maintains no internal state between ticks
 * beyond what is passed in, making it safe to use with reactive ECHO data.
 */
export class Life {
  private readonly _gridX: number;
  private readonly _gridY: number;
  private readonly _hue: string;

  constructor({ gridX, gridY, hue = 'green' }: { gridX: number; gridY: number; hue?: string }) {
    this._gridX = gridX;
    this._gridY = gridY;
    this._hue = hue;
  }

  /** Compute the next generation from the current voxel state. */
  tick(voxels: Voxel.VoxelData[]): Voxel.VoxelData[] {
    const alive = new Set<string>();
    const hueMap = new Map<string, string>();
    for (const voxel of voxels) {
      const key = `${voxel.x}:${voxel.y}:${voxel.z}`;
      alive.add(key);
      hueMap.set(key, voxel.hue);
    }

    // Count neighbors for all cells adjacent to live cells.
    const neighborCount = new Map<string, number>();
    for (const voxel of voxels) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) {
              continue;
            }
            const nx = voxel.x + dx;
            const ny = voxel.y + dy;
            const nz = voxel.z + dz;
            // Skip cells below ground or outside grid bounds.
            if (nz < 0 || !this._isInBounds(nx, ny)) {
              continue;
            }
            const key = `${nx}:${ny}:${nz}`;
            neighborCount.set(key, (neighborCount.get(key) ?? 0) + 1);
          }
        }
      }
    }

    const next: Voxel.VoxelData[] = [];
    for (const [key, count] of neighborCount) {
      const isAlive = alive.has(key);
      // Survival: 5-7 neighbors. Birth: exactly 6 neighbors.
      if ((isAlive && count >= 5 && count <= 7) || (!isAlive && count === 6)) {
        const [x, y, z] = key.split(':').map(Number);
        if (this._isInBounds(x, y)) {
          next.push({ x, y, z, hue: hueMap.get(key) ?? this._hue });
        }
      }
    }

    return next;
  }

  /** Generate a random pattern on the ground plane (z=0). */
  randomPattern(density = 0.3): Voxel.VoxelData[] {
    const halfX = Math.floor(this._gridX / 2);
    const halfY = Math.floor(this._gridY / 2);
    // Use a smaller region for a more interesting initial pattern.
    const extent = Math.min(halfX, halfY, 8);
    const voxels: Voxel.VoxelData[] = [];
    for (let x = -extent; x < extent; x++) {
      for (let y = -extent; y < extent; y++) {
        if (Math.random() < density) {
          voxels.push({ x, y, z: 0, hue: this._hue });
        }
      }
    }
    return voxels;
  }

  private _isInBounds(x: number, y: number): boolean {
    const halfX = Math.floor(this._gridX / 2);
    const halfY = Math.floor(this._gridY / 2);
    return x >= -halfX && x < halfX && y >= -halfY && y < halfY;
  }
}
