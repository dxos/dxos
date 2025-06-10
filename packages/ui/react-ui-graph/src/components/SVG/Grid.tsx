//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useGrid, type GridOptions } from '../../hooks';

export type GridProps = ThemedClassName<GridOptions>;

/**
 * SVG grid wrapper.
 */
export const Grid = ({ classNames, ...props }: GridProps) => {
  const { ref } = useGrid(props);
  return <g ref={ref} className={mx('dx-grid', classNames)} />;
};
