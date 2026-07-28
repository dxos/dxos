//
// Copyright 2026 DXOS.org
//

import { FACE_UPS, type TerraConfigValues, type Vec3, dot, faceBasis, makeSampler, unitOnFace } from '../engine';

/** Movement medium; each has its own passability rule over the same grid. */
export type Domain = 'sea' | 'land' | 'air';

export type NavCell = {
  index: number;
  unit: Vec3;
  elevation: number;
  neighbors: number[];
};

export type NavGrid = {
  resolution: number;
  waterLevel: number;
  cells: NavCell[];
  findNearest(unit: Vec3): number;
};

const DEFAULT_RESOLUTION = 24;

/** Ground units cannot climb the upper part of the land range; keeps tanks out of mountain ranges. */
const LAND_SLOPE_CEILING = 0.35;

/**
 * Builds a coarse passability grid over the cubed sphere, sampling the same seeded elevation the
 * terrain mesh uses so routes agree with what is rendered.
 */
export const buildNavGrid = (config: TerraConfigValues, resolution: number = DEFAULT_RESOLUTION): NavGrid => {
  const { elevation } = makeSampler(config);
  const cells: NavCell[] = [];

  FACE_UPS.forEach((up, face) => {
    const { axisA, axisB } = faceBasis(up);
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        // Sample cell centres so a cell's elevation represents its interior, not a shared corner.
        const unit = unitOnFace(up, axisA, axisB, i + 0.5, j + 0.5, resolution);
        cells.push({
          index: face * resolution * resolution + j * resolution + i,
          unit,
          elevation: elevation(unit),
          neighbors: [],
        });
      }
    }
  });

  const cellAt = (face: number, i: number, j: number): number => face * resolution * resolution + j * resolution + i;
  const edgeIndices: number[] = [];

  for (let face = 0; face < FACE_UPS.length; face++) {
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        const index = cellAt(face, i, j);
        const neighbors = cells[index].neighbors;
        if (i > 0) {
          neighbors.push(cellAt(face, i - 1, j));
        }
        if (i < resolution - 1) {
          neighbors.push(cellAt(face, i + 1, j));
        }
        if (j > 0) {
          neighbors.push(cellAt(face, i, j - 1));
        }
        if (j < resolution - 1) {
          neighbors.push(cellAt(face, i, j + 1));
        }
        if (i === 0 || j === 0 || i === resolution - 1 || j === resolution - 1) {
          edgeIndices.push(index);
        }
      }
    }
  }

  // Stitch faces together: an edge cell's missing neighbours are the nearest edge cells on other
  // faces, which is exact enough at grid resolution and avoids hand-coding twelve cube-edge maps.
  const faceOf = (index: number): number => Math.floor(index / (resolution * resolution));
  for (const index of edgeIndices) {
    const cell = cells[index];
    const missing = 4 - cell.neighbors.length;
    if (missing <= 0) {
      continue;
    }

    // Exclude already-linked cells before taking the top N: a prior cell's reciprocal push may
    // have already connected one of the nearest candidates, and slicing first would waste that
    // slot instead of reaching for the next-nearest one.
    const candidates = edgeIndices
      .filter((other) => faceOf(other) !== faceOf(index) && !cell.neighbors.includes(other))
      .map((other) => ({ other, distance: dot(cell.unit, cells[other].unit) }))
      .sort((left, right) => right.distance - left.distance)
      .slice(0, missing);

    for (const { other } of candidates) {
      cell.neighbors.push(other);
      if (!cells[other].neighbors.includes(index)) {
        cells[other].neighbors.push(index);
      }
    }
  }

  const findNearest = (unit: Vec3): number => {
    let best = 0;
    let bestDot = -Infinity;
    for (const cell of cells) {
      const value = dot(unit, cell.unit);
      if (value > bestDot) {
        bestDot = value;
        best = cell.index;
      }
    }
    return best;
  };

  return { resolution, waterLevel: config.waterLevel, cells, findNearest };
};

/** Whether a cell can be traversed by the given domain. */
export const isPassable = (grid: NavGrid, index: number, domain: Domain, cruiseElevation = Infinity): boolean => {
  const { elevation } = grid.cells[index];
  switch (domain) {
    case 'sea':
      return elevation < grid.waterLevel;
    case 'land':
      return elevation >= grid.waterLevel && elevation < grid.waterLevel + LAND_SLOPE_CEILING * (1 - grid.waterLevel);
    case 'air':
      return elevation < cruiseElevation;
  }
};
