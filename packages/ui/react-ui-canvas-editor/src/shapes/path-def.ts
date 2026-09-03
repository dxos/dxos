//
// Copyright 2024 DXOS.org
//

import { type Point } from '@dxos/react-ui-canvas';

import { createCurveThroughPoints, createPathThroughPoints2 } from '../layout/index.ts';
import { type PathShape } from '../types/index.ts';

// Kept out of `Path.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the factory exported beside one forces a full page reload on every edit.

export type CreatePathProps = Omit<PathShape, 'type' | 'path'> & { points: Point[] };

export const createPath = ({ id, points, ...rest }: CreatePathProps): PathShape => ({
  id,
  type: 'path',
  path: points.length === 2 ? createPathThroughPoints2(points) : createCurveThroughPoints(points),
  ...rest,
});
