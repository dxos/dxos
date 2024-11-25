//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

interface Layout {
  rows: number;
  cols: number;
}

const possibleLayouts = (count: number) => {
  const max = Math.ceil(Math.sqrt(count));

  const layouts: Layout[] = [{ rows: max, cols: max }];

  for (let rows = 1; rows < max; rows++) {
    layouts.push({
      rows,
      cols: Math.ceil(count / rows),
    });
  }

  for (let cols = 1; cols < max; cols++) {
    layouts.push({
      cols,
      rows: Math.ceil(count / cols),
    });
  }

  return layouts;
};

/**
 * Finds the layout that would provide the largest 16:9
 * tiles given the container dimensions, and number of
 * tiles to fit.
 */
export const calculateLayout = (config: { count: number; height: number; width: number }): Layout => {
  const { count, height, width } = config;
  if (height === 0 || width === 0) {
    return {
      cols: 0,
      rows: 0,
    };
  }

  let idealLayout: null | Layout = null;
  let largestArea = 0;

  const targetTileAspectRatio = 4 / 3;

  for (const layout of possibleLayouts(count)) {
    const tileHeight = height / layout.rows;
    const tileWidth = width / layout.cols;

    const constrainingDimension = tileHeight > tileWidth ? 'width' : 'height';

    const area =
      constrainingDimension === 'height'
        ? targetTileAspectRatio *
          tileHeight * // calculate tileWidth
          tileHeight // then multiply by tileHeight
        : (1 / targetTileAspectRatio) *
          tileWidth * // calculate tileHeight
          tileWidth; // then multiply by tileWidth;

    if (area > largestArea) {
      largestArea = area;
      idealLayout = layout;
    }
  }
  invariant(idealLayout);
  return idealLayout;
};
