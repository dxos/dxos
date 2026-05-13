//
// Copyright 2026 DXOS.org
//

import { type Voxel } from '#types';

/** Well-known Game of Life seed patterns (coordinates relative to origin). */
type Pattern = { name: string; cells: [number, number][] };

const PATTERNS: Pattern[] = [
  // Glider — translates diagonally.
  {
    name: 'glider',
    cells: [
      [0, 1],
      [1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ],
  },
  // Lightweight spaceship (LWSS) — translates horizontally.
  {
    name: 'lwss',
    cells: [
      [-2, 1],
      [1, 1],
      [2, 0],
      [-2, -1],
      [2, -1],
      [-1, -2],
      [0, -2],
      [1, -2],
      [2, -2],
    ],
  },
  // R-pentomino — small methuselah that evolves for 1103 generations.
  {
    name: 'r-pentomino',
    cells: [
      [0, 1],
      [1, 1],
      [-1, 0],
      [0, 0],
      [0, -1],
    ],
  },
  // Acorn — methuselah that takes 5206 generations to stabilize.
  {
    name: 'acorn',
    cells: [
      [-2, 1],
      [0, 0],
      [-3, -1],
      [-2, -1],
      [1, -1],
      [2, -1],
      [3, -1],
    ],
  },
  // Gosper glider gun — produces a stream of gliders.
  {
    name: 'gosper-glider-gun',
    cells: [
      // Left block.
      [-17, 1],
      [-17, 0],
      [-16, 1],
      [-16, 0],
      // Left ship.
      [-7, 2],
      [-7, 1],
      [-7, 0],
      [-6, 3],
      [-6, -1],
      [-5, 4],
      [-5, -2],
      [-4, 4],
      [-4, -2],
      [-3, 1],
      [-2, 3],
      [-2, -1],
      [-1, 2],
      [-1, 1],
      [-1, 0],
      [0, 1],
      // Right ship.
      [3, 4],
      [3, 3],
      [3, 2],
      [4, 4],
      [4, 3],
      [4, 2],
      [5, 5],
      [5, 1],
      [7, 6],
      [7, 5],
      [7, 1],
      [7, 0],
      // Right block.
      [17, 4],
      [17, 3],
      [18, 4],
      [18, 3],
    ],
  },
  // Pulsar — period-3 oscillator.
  {
    name: 'pulsar',
    cells: [
      // Top-right quadrant (mirrored to all four).
      ...[
        [2, 1],
        [3, 1],
        [4, 1],
        [1, 2],
        [1, 3],
        [1, 4],
        [6, 2],
        [6, 3],
        [6, 4],
        [2, 6],
        [3, 6],
        [4, 6],
      ].flatMap(([x, y]) => [
        [x, y] as [number, number],
        [-x, y] as [number, number],
        [x, -y] as [number, number],
        [-x, -y] as [number, number],
      ]),
    ],
  },
  // Diehard — vanishes after 130 generations.
  {
    name: 'diehard',
    cells: [
      [-3, 0],
      [-2, 0],
      [-2, -1],
      [2, -1],
      [3, 1],
      [3, -1],
      [4, -1],
    ],
  },
];

/**
 * 2D Game of Life simulation on the ground plane (z=0).
 *
 * Uses standard Conway rules with the 8-cell Moore neighborhood:
 * - A live cell survives if it has 2-3 neighbors.
 * - A dead cell is born if it has exactly 3 neighbors.
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

  /** Compute the next generation from the current voxel state (ground plane only). */
  tick(voxels: Voxel.VoxelData[]): Voxel.VoxelData[] {
    // Only consider ground-layer cells for the simulation.
    const groundVoxels = voxels.filter((voxel) => voxel.z === 0);
    const alive = new Set<string>();
    const hueMap = new Map<string, string>();
    for (const voxel of groundVoxels) {
      const key = `${voxel.x}:${voxel.y}`;
      alive.add(key);
      hueMap.set(key, voxel.hue);
    }

    // Count neighbors using 2D Moore neighborhood (8 adjacent cells).
    const neighborCount = new Map<string, number>();
    for (const voxel of groundVoxels) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nx = voxel.x + dx;
          const ny = voxel.y + dy;
          if (!this._isInBounds(nx, ny)) {
            continue;
          }
          const key = `${nx}:${ny}`;
          neighborCount.set(key, (neighborCount.get(key) ?? 0) + 1);
        }
      }
    }

    // Preserve non-ground voxels unchanged.
    const next: Voxel.VoxelData[] = voxels.filter((voxel) => voxel.z !== 0);

    // Apply standard Conway rules: survive with 2-3, born with exactly 3.
    for (const [key, count] of neighborCount) {
      const isAlive = alive.has(key);
      if ((isAlive && (count === 2 || count === 3)) || (!isAlive && count === 3)) {
        const [x, y] = key.split(':').map(Number);
        if (this._isInBounds(x, y)) {
          next.push({ x, y, z: 0, hue: hueMap.get(key) ?? this._hue });
        }
      }
    }

    return next;
  }

  /** Pick a random well-known pattern and place it near the origin. */
  randomPattern(): Voxel.VoxelData[] {
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    return pattern.cells.map(([x, y]) => ({ x, y, z: 0, hue: this._hue }));
  }

  /** Check whether a coordinate is within the grid. */
  private _isInBounds(x: number, y: number): boolean {
    const halfX = Math.floor(this._gridX / 2);
    const halfY = Math.floor(this._gridY / 2);
    return x >= -halfX && x < halfX && y >= -halfY && y < halfY;
  }
}
