//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useId, useMemo } from 'react';

import { type ThemedClassName, useForwardedRef } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useCanvasContext } from '../../hooks';
import { type Point } from '../../types';
import { GridPattern, testId } from '../../util';

const gridRatios = [1 / 4, 1, 4, 16];

const defaultGridSize = 16;
const defaultOffset: Point = { x: 0, y: 0 };

const createId = (parent: string, grid: number) => `dx-canvas-grid-${parent}-${grid}`;

// TODO(burdon): Click to drag.

export type GridProps = ThemedClassName<{
  size?: number;
  scale?: number;
  offset?: Point;
  showAxes?: boolean;
}>;

// TODO(burdon): Use id of parent canvas.
export const Grid = (props: GridProps) => {
  const { scale, offset } = useCanvasContext();
  return <GridComponent {...props} scale={scale} offset={offset} />;
};

export const GridComponent = forwardRef<SVGSVGElement, GridProps>(
  (
    { size: gridSize = defaultGridSize, scale = 1, offset = defaultOffset, showAxes = true, classNames },
    forwardedRef,
  ) => {
    const svgRef = useForwardedRef(forwardedRef);
    const { width = 0, height = 0 } = svgRef.current?.getBoundingClientRect() ?? {};

    const instanceId = useId();
    const grids = useMemo(
      () =>
        gridRatios
          .map((ratio) => ({ id: ratio, size: ratio * gridSize * scale }))
          .filter(({ size }) => size >= gridSize && size <= 128),
      [gridSize, scale],
    );

    return (
      <svg
        {...testId('dx-canvas-grid')}
        ref={svgRef}
        className={mx(
          'absolute inset-0 is-full bs-full pointer-events-none touch-none select-none',
          'stroke-neutral-500',
          classNames,
        )}
      >
        {/* NOTE: The pattern is offset so that the middle of the pattern aligns with the grid. */}
        <defs>
          {grids.map(({ id, size }) => (
            <GridPattern key={id} id={createId(instanceId, id)} offset={offset} size={size} />
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
              fill={`url(#${createId(instanceId, id)})`}
              width='100%'
              height='100%'
            />
          ))}
        </g>
      </svg>
    );
  },
);
