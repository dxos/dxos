//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { useForwardedRef, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Point } from '../../types';
import { GridPattern, testId } from '../../util';

const gridRatios = [1 / 4, 1, 4, 16];

const defaultOffset: Point = { x: 0, y: 0 };

const createId = (parent: string, grid: number) => `dx-canvas-grid-${parent}-${grid}`;

export type GridProps = ThemedClassName<{
  id: string;
  size: number;
  scale?: number;
  offset?: Point;
  showAxes?: boolean;
}>;

export const Grid = forwardRef<SVGSVGElement, GridProps>(
  ({ id: parentId, size: gridSize, scale = 1, offset = defaultOffset, showAxes = true, classNames }, forwardedRef) => {
    const svgRef = useForwardedRef(forwardedRef);
    const grids = useMemo(
      () =>
        gridRatios
          .map((ratio) => ({ id: ratio, size: ratio * gridSize * scale }))
          .filter(({ size }) => size >= gridSize && size <= 256),
      [gridSize, scale],
    );

    const { width = 0, height = 0 } = svgRef.current?.getBoundingClientRect() ?? {};

    return (
      <svg
        {...testId('dx-canvas-grid')}
        ref={svgRef}
        className={mx(
          'absolute inset-0 w-full h-full pointer-events-none touch-none select-none',
          'stroke-neutral-500',
          classNames,
        )}
      >
        {/* NOTE: The pattern is offset so that the middle of the pattern aligns with the grid. */}
        <defs>
          {grids.map(({ id, size }) => (
            <GridPattern key={id} id={createId(parentId, id)} offset={offset} size={size} />
          ))}
        </defs>
        {showAxes && (
          <>
            <line x1={0} y1={offset.y} x2={width} y2={offset.y} className='stroke-neutral-500 opacity-40' />
            <line x1={offset.x} y1={0} x2={offset.x} y2={height} className='stroke-neutral-500 opacity-40' />
          </>
        )}
        <g>
          {grids.map(({ id }, i) => (
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
