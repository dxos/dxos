//
// Copyright 2024 DXOS.org
//

import React from 'react';

import type { Dimension } from './geometry';

export const Grid = ({ width, height }: Dimension) => {
  return (
    <>
      {/* NOTE: Pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
      <defs>
        <pattern id='grid_lines' width={16} height={16} patternUnits='userSpaceOnUse'>
          <line x1={0} y1={8} x2={16} y2={8} stroke='#888' />
          <line x1={8} y1={0} x2={8} y2={16} stroke='#888' />
        </pattern>
        <pattern id='grid_dot' width={16} height={16} patternUnits='userSpaceOnUse'>
          <circle cx={8} cy={8} r={0.5} stroke='#888' />
        </pattern>
      </defs>

      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill='url(#grid_lines)'
        style={{ transform: 'translate(-8px, -8px)' }}
        opacity={0.2}
      />
    </>
  );
};
