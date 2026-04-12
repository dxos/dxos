//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

export interface Preset {
  key: string;
  name: string;
  gridTypes: Tile.GridType[];
}

/**
 * Returns the list of available preset tessellation patterns.
 */
export const listPresets = (): Preset[] => [
  { key: 'checkerboard', name: 'Checkerboard', gridTypes: ['square', 'hex', 'triangle'] },
  { key: 'herringbone', name: 'Herringbone', gridTypes: ['square'] },
  { key: 'honeycomb', name: 'Honeycomb', gridTypes: ['hex'] },
  { key: 'diamond', name: 'Diamond', gridTypes: ['square'] },
  { key: 'basketweave', name: 'Basketweave', gridTypes: ['square'] },
  { key: 'pinwheel', name: 'Pinwheel', gridTypes: ['triangle'] },
];

/**
 * Generate a cells map for a named preset pattern.
 */
export const applyPreset = (
  preset: string,
  gridType: Tile.GridType,
  gridWidth: number,
  gridHeight: number,
  colors: string[],
): Record<string, string> => {
  const cells: Record<string, string> = {};
  const color = (index: number) => colors[index % colors.length];

  switch (preset) {
    case 'checkerboard':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          cells[`${q},${r}`] = color((q + r) % 2);
        }
      }
      break;

    case 'herringbone':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const block = Math.floor(q / 2) + Math.floor(r / 2);
          cells[`${q},${r}`] = color((block + (r % 2)) % 2);
        }
      }
      break;

    case 'honeycomb':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const index = ((q % 3) + (r % 3)) % 3;
          cells[`${q},${r}`] = color(index);
        }
      }
      break;

    case 'diamond':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const cx = gridWidth / 2;
          const cy = gridHeight / 2;
          const dist = Math.abs(q - cx) + Math.abs(r - cy);
          cells[`${q},${r}`] = color(Math.floor(dist) % colors.length);
        }
      }
      break;

    case 'basketweave':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const blockQ = Math.floor(q / 2);
          const blockR = Math.floor(r / 2);
          const inBlock = (q % 2) + (r % 2);
          cells[`${q},${r}`] = color((blockQ + blockR + (inBlock > 0 ? 1 : 0)) % 2);
        }
      }
      break;

    case 'pinwheel':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const section = (q + r) % 4;
          cells[`${q},${r}`] = color(section % colors.length);
        }
      }
      break;
  }

  return cells;
};
