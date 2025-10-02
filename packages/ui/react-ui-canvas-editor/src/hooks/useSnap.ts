//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

import { type Dimension, type Point } from '@dxos/react-ui-canvas';

import { type PointTransform, round } from '../layout';

import { useEditorContext } from './useEditorContext';

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
  const { options, snapToGrid } = useEditorContext();
  return useMemo<PointTransform>(() => {
    const snap = options.gridSnap ?? options.gridSize;
    return snapToGrid && snap ? createSnap({ width: snap, height: snap }) : (p) => p;
  }, [options.gridSnap, snapToGrid]);
};
