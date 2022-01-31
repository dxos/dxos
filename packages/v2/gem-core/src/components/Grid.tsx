//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { css } from '@emotion/css';

import { useGrid, useSvgContext } from '../hooks';

export const gridStyles = css`
  path.axis {
    stroke: #AAAAAA;
  }
  path.major {
    stroke: #E0E0E0;
  }
  path.minor {
    stroke: #F0F0F0;
  }
`;

export interface GridProps {
  className?: string
  axis?: boolean
}

/**
 * Displays the grid.
 * @param className
 * @param axis
 * @constructor
 */
export const Grid = ({ className = gridStyles, axis }: GridProps) => {
  const context = useSvgContext();
  const ref = useGrid(context, { axis });

  return (
    <g
      ref={ref}
      className={className}
    />
  );
};
