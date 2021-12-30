//
// Copyright 2020 DXOS.org
//

import { Point } from './grid';

// https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
export const createPath = (points: Point[]) => 'M ' + points.map(({ x, y }: Point) => `${x} ${y}`).join(' L ');
