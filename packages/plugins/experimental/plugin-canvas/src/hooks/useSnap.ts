//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

import { Dimension, Point } from '../types';
import { useEditorContext } from './useEditorContext';
import { type PointTransform, round } from '../layout';

export const createSnap =
  ({ width, height }: Dimension): PointTransform =>
  ({ x, y }: Point): Point => ({
    x: round(x, width),
    y: round(y, height),
  });

/**
 *
 */
export const useSnap = (): PointTransform => {
  const { gridSize, snapToGrid } = useEditorContext();
  return useMemo(() => (snapToGrid ? createSnap(gridSize) : (p) => p), [gridSize, snapToGrid]);
};
