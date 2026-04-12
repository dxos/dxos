//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

import { type Coord, type Point } from './types';

/**
 * Convert axial (q, r) coordinates to pixel (x, y) center point.
 */
export const axialToPixel = (q: number, r: number, gridType: Tile.GridType, tileSize: number): Point => {
  switch (gridType) {
    case 'square':
      return { x: q * tileSize, y: r * tileSize };

    case 'hex': {
      // Flat-top hexagon.
      const x = tileSize * (3 / 2) * q;
      const y = tileSize * Math.sqrt(3) * (r + q / 2);
      return { x, y };
    }

    case 'triangle': {
      // Alternating up/down triangles. q indexes within row, r indexes row.
      const x = (tileSize / 2) * q;
      const y = ((tileSize * Math.sqrt(3)) / 2) * r;
      return { x, y };
    }
  }
};

/**
 * Convert pixel (x, y) to nearest axial (q, r) coordinate.
 */
export const pixelToAxial = (x: number, y: number, gridType: Tile.GridType, tileSize: number): Coord => {
  switch (gridType) {
    case 'square':
      return { q: Math.round(x / tileSize), r: Math.round(y / tileSize) };

    case 'hex': {
      // Inverse of flat-top hex formula.
      const q = ((2 / 3) * x) / tileSize;
      const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / tileSize;
      // Round to nearest hex using cube coordinate rounding.
      return hexRound(q, r);
    }

    case 'triangle': {
      const r = Math.round(y / ((tileSize * Math.sqrt(3)) / 2));
      const q = Math.round(x / (tileSize / 2));
      return { q, r };
    }
  }
};

/**
 * Round fractional axial hex coordinates to nearest integer hex.
 */
const hexRound = (q: number, r: number): Coord => {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
};
