//
// Copyright 2022 DXOS.org
//

import React from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type GridOptions, useGrid } from '../../hooks/index.ts';

export type GridProps = Util.ThemedClassName<GridOptions>;

/**
 * SVG grid wrapper.
 */
export const Grid = ({ classNames, ...props }: GridProps) => {
  const { ref } = useGrid(props);
  return <g ref={ref} className={mx('dx-grid', classNames)} />;
};
