//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Point } from '../../layout';
import { eventsNone } from '../styles';
import { GridPattern } from '../svg';
import { testId } from '../util';

const defaultGridSize = 16;

const gridSizes = [1 / 2, 1, 2, 8];

export type GridProps = ThemedClassName<{ size?: number; offset?: Point; scale?: number }>;

export const Grid = forwardRef<SVGSVGElement, GridProps>(
  ({ size = defaultGridSize, offset = { x: 0, y: 0 }, scale = 1, classNames }, forwardedRef) => {
    const grids = useMemo(
      () => gridSizes.map((s) => ({ id: s, size: s * size * scale })).filter(({ size }) => size >= 16 && size <= 128),
      [size, scale],
    );

    return (
      <svg
        {...testId('dx-canvas-grid')}
        className={mx('absolute inset-0', eventsNone, classNames)}
        width='100%'
        height='100%'
        ref={forwardedRef}
      >
        {/* NOTE: The pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
        <defs>
          {grids.map(({ id, size }) => (
            <GridPattern key={id} id={`dx-canvas-grid-${id}`} offset={offset} size={size} />
          ))}
        </defs>
        {grids.map(({ id, size }, i) => (
          <rect key={id} width='100%' height='100%' fill={`url(#dx-canvas-grid-${id})`} />
        ))}
      </svg>
    );
  },
);
