//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Point } from './geometry';

const gridSize = 16;

export type GridProps = ThemedClassName<{ offset?: Point }>;

export const Grid = forwardRef<SVGSVGElement, GridProps>(({ offset, classNames }, forwardedRef) => {
  return (
    <svg
      width='100%'
      height='100%'
      className={mx('absolute inset-0 pointer-events-none touch-none', classNames)}
      ref={forwardedRef}
    >
      {/* NOTE: The pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
      <defs>
        {/* TODO(burdon): Multiple sizes. */}
        <pattern
          id='grid_lines'
          x={((offset?.x ?? 0) + gridSize / 2) % gridSize}
          y={((offset?.y ?? 0) + gridSize / 2) % gridSize}
          width={gridSize}
          height={gridSize}
          patternUnits='userSpaceOnUse'
        >
          <g opacity={0.2}>
            <line x1={0} y1={gridSize / 2} x2={gridSize} y2={gridSize / 2} stroke='#888' />
            <line x1={gridSize / 2} y1={0} x2={gridSize / 2} y2={gridSize} stroke='#888' />
          </g>
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill='url(#grid_lines)' />
    </svg>
  );
});
