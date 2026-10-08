//
// Copyright 2024 DXOS.org
//

import { type Point } from '../types.ts';

// Kept out of `svg.tsx`: react-refresh only fast-refreshes a module whose exports are all components,
// so a helper exported beside them forces a full page reload on every edit.

/** https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths */
export const createPath = (points: Point[], join = false) => {
  return ['M', points.map(({ x, y }) => `${x},${y}`).join(' L '), join ? 'Z' : ''].join(' ');
};
