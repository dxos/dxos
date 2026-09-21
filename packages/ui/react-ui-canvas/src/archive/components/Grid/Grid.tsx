//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { GridComponent, type GridProps } from '../../../components/Grid/index.ts';
import { useCanvasContext } from '../../hooks/index.ts';

export type { GridProps };
export { GridComponent };

// TODO(burdon): Use id of parent canvas.
export const Grid = (props: GridProps) => {
  const { scale, offset } = useCanvasContext();
  return <GridComponent {...props} scale={scale} offset={offset} />;
};
