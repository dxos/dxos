//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Point } from '../../types';
import { GridPattern, testId, eventsNone } from '../../util';

const gridRatios = [1 / 4, 1, 4, 16];

export type GridProps = ThemedClassName<{ id: string; size?: number; scale?: number; offset?: Point }>;

export const Grid = forwardRef<SVGSVGElement, GridProps>(
  ({ id: parentId, size = 16, scale = 1, offset = { x: 0, y: 0 }, classNames }, forwardedRef) => {
    const grids = useMemo(
      () =>
        gridRatios
          .map((ratio) => ({ id: ratio, size: ratio * size * scale }))
          .filter(({ size }) => size >= 16 && size <= 256),
      [size, scale],
    );

    return (
      <svg
        {...testId('dx-canvas-grid')}
        ref={forwardedRef}
        className={mx('absolute inset-0 w-full h-full', eventsNone, classNames)}
      >
        {/* NOTE: The pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
        <defs>
          {grids.map(({ id, size }) => (
            <GridPattern key={id} id={createId(parentId, id)} offset={offset} size={size} />
          ))}
        </defs>
        <g>
          {grids.map(({ id, size }, i) => (
            <rect
              key={id}
              opacity={0.1 + i * 0.05}
              fill={`url(#${createId(parentId, id)})`}
              width='100%'
              height='100%'
            />
          ))}
        </g>
      </svg>
    );
  },
);

const createId = (parent: string, grid: number) => `plugin-canvas-grid-${parent}-${grid}`;
