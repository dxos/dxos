//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

import { type ViewBox } from './types';

export interface VisibleRange {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
}

/**
 * Calculate the range of axial coordinates visible within the given viewport.
 * Adds a 1-tile buffer on each side for smooth scrolling.
 */
export const visibleRange = (viewBox: ViewBox, gridType: Tile.GridType, tileSize: number): VisibleRange => {
  const buffer = 1;

  switch (gridType) {
    case 'square':
      return {
        qMin: Math.floor(viewBox.x / tileSize) - buffer,
        qMax: Math.ceil((viewBox.x + viewBox.width) / tileSize) + buffer,
        rMin: Math.floor(viewBox.y / tileSize) - buffer,
        rMax: Math.ceil((viewBox.y + viewBox.height) / tileSize) + buffer,
      };

    case 'hex': {
      const colWidth = tileSize * (3 / 2);
      const rowHeight = tileSize * Math.sqrt(3);
      return {
        qMin: Math.floor(viewBox.x / colWidth) - buffer,
        qMax: Math.ceil((viewBox.x + viewBox.width) / colWidth) + buffer,
        rMin: Math.floor(viewBox.y / rowHeight) - buffer,
        rMax: Math.ceil((viewBox.y + viewBox.height) / rowHeight) + buffer,
      };
    }

    case 'triangle': {
      const colWidth = tileSize / 2;
      const rowHeight = (tileSize * Math.sqrt(3)) / 2;
      return {
        qMin: Math.floor(viewBox.x / colWidth) - buffer,
        qMax: Math.ceil((viewBox.x + viewBox.width) / colWidth) + buffer,
        rMin: Math.floor(viewBox.y / rowHeight) - buffer,
        rMax: Math.ceil((viewBox.y + viewBox.height) / rowHeight) + buffer,
      };
    }
  }
};
