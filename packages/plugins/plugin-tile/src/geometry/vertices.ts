//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

import { axialToPixel } from './axial';
import { type Point } from './types';

/**
 * Get polygon vertices for a tile at axial (q, r).
 * Returns array of {x, y} points in drawing order.
 */
export const tileVertices = (q: number, r: number, gridType: Tile.GridType, tileSize: number): Point[] => {
  const center = axialToPixel(q, r, gridType, tileSize);

  switch (gridType) {
    case 'square': {
      const half = tileSize / 2;
      return [
        { x: center.x - half, y: center.y - half },
        { x: center.x + half, y: center.y - half },
        { x: center.x + half, y: center.y + half },
        { x: center.x - half, y: center.y + half },
      ];
    }

    case 'hex': {
      // Flat-top hexagon: vertices at 0°, 60°, 120°, 180°, 240°, 300°.
      return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i);
        return {
          x: center.x + tileSize * Math.cos(angle),
          y: center.y + tileSize * Math.sin(angle),
        };
      });
    }

    case 'triangle': {
      const h = (tileSize * Math.sqrt(3)) / 2;
      const isUp = (q + r) % 2 === 0;

      if (isUp) {
        return [
          { x: center.x, y: center.y - (2 / 3) * h },
          { x: center.x + tileSize / 2, y: center.y + (1 / 3) * h },
          { x: center.x - tileSize / 2, y: center.y + (1 / 3) * h },
        ];
      } else {
        return [
          { x: center.x, y: center.y + (2 / 3) * h },
          { x: center.x + tileSize / 2, y: center.y - (1 / 3) * h },
          { x: center.x - tileSize / 2, y: center.y - (1 / 3) * h },
        ];
      }
    }
  }
};

/**
 * Convert vertices array to SVG polygon points string.
 */
export const verticesToSvgPoints = (vertices: Point[]): string =>
  vertices.map(({ x, y }) => `${x},${y}`).join(' ');
