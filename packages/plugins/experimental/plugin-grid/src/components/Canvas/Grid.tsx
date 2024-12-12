//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Point } from './geometry';

const gridSize = 16;

export type GridProps = ThemedClassName<{ size?: number; offset?: Point; scale?: number }>;

export const Grid = forwardRef<SVGSVGElement, GridProps>(
  ({ size = gridSize, offset = { x: 0, y: 0 }, scale = 1, classNames }, forwardedRef) => {
    const gridSize = size * scale;

    return (
      <svg
        width='100%'
        height='100%'
        className={mx('absolute inset-0 pointer-events-none touch-none', classNames)}
        ref={forwardedRef}
      >
        {/* NOTE: The pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
        {/* TODO(burdon): Multiple sizes. */}
        <defs>
          <Pattern id='grid_1' offset={offset} opacity={0.1} size={gridSize} />
          <Pattern id='grid_2' offset={offset} opacity={0.2} size={gridSize * 4} />
        </defs>
        <rect width='100%' height='100%' fill='url(#grid_1)' />
        <rect width='100%' height='100%' fill='url(#grid_2)' />
      </svg>
    );
  },
);

const Pattern = ({ id, size, opacity, offset }: { id: string; size: number; opacity: number; offset: Point }) => (
  <defs>
    <pattern
      id={id}
      x={(size / 2 + offset.x) % size}
      y={(size / 2 + offset.y) % size}
      width={size}
      height={size}
      patternUnits='userSpaceOnUse'
    >
      <g opacity={opacity}>
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke='#888' />
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke='#888' />
      </g>
    </pattern>
  </defs>
);
