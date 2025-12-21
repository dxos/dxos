//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type GridOptions, useGrid } from '../../hooks';

export type GridProps = ThemedClassName<GridOptions>;

/**
 * SVG grid wrapper.
 */
export const Grid = ({ classNames, ...props }: GridProps) => {
  const { ref } = useGrid(props);
  return <g ref={ref} className={mx('dx-grid', classNames)} />;
};
