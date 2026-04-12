//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

/**
 * Calculate physical dimensions of a grid in millimeters.
 */
export const gridToPhysical = (
  tileSize: number,
  groutWidth: number,
  gridWidth: number,
  gridHeight: number,
  gridType: Tile.GridType,
): { widthMm: number; heightMm: number } => {
  switch (gridType) {
    case 'square': {
      const widthMm = gridWidth * tileSize + (gridWidth - 1) * groutWidth;
      const heightMm = gridHeight * tileSize + (gridHeight - 1) * groutWidth;
      return { widthMm, heightMm };
    }

    case 'hex': {
      const widthMm = tileSize * (3 / 2) * (gridWidth - 1) + 2 * tileSize + (gridWidth - 1) * groutWidth;
      const rowHeight = tileSize * Math.sqrt(3);
      const heightMm = rowHeight * gridHeight + (gridHeight - 1) * groutWidth;
      return { widthMm, heightMm };
    }

    case 'triangle': {
      const widthMm = (tileSize / 2) * (gridWidth + 1) + (gridWidth - 1) * groutWidth;
      const rowHeight = (tileSize * Math.sqrt(3)) / 2;
      const heightMm = rowHeight * gridHeight + (gridHeight - 1) * groutWidth;
      return { widthMm, heightMm };
    }
  }
};

/**
 * Calculate grid dimensions to fill a room of given size.
 */
export const fitToRoom = (
  roomWidth: number,
  roomHeight: number,
  tileSize: number,
  groutWidth: number,
  gridType: Tile.GridType,
): { gridWidth: number; gridHeight: number } => {
  switch (gridType) {
    case 'square': {
      const step = tileSize + groutWidth;
      const gridWidth = Math.floor((roomWidth + groutWidth) / step);
      const gridHeight = Math.floor((roomHeight + groutWidth) / step);
      return { gridWidth: Math.max(1, gridWidth), gridHeight: Math.max(1, gridHeight) };
    }

    case 'hex': {
      const colStep = tileSize * (3 / 2) + groutWidth;
      const rowStep = tileSize * Math.sqrt(3) + groutWidth;
      const gridWidth = Math.max(1, Math.floor((roomWidth - 2 * tileSize + groutWidth) / colStep) + 1);
      const gridHeight = Math.max(1, Math.floor((roomHeight + groutWidth) / rowStep));
      return { gridWidth, gridHeight };
    }

    case 'triangle': {
      const colStep = tileSize / 2 + groutWidth;
      const rowStep = (tileSize * Math.sqrt(3)) / 2 + groutWidth;
      const gridWidth = Math.max(1, Math.floor((roomWidth + groutWidth) / colStep));
      const gridHeight = Math.max(1, Math.floor((roomHeight + groutWidth) / rowStep));
      return { gridWidth, gridHeight };
    }
  }
};
