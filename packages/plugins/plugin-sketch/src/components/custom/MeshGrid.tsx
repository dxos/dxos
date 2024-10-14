//
// Copyright 2024 DXOS.org
//

import { type TLGridProps } from '@tldraw/editor';
import { useDefaultColorTheme } from '@tldraw/tldraw';
import { modulate } from '@tldraw/utils';
import React from 'react';

const GRID_STEPS = [
  { min: -1, mid: 0.15, step: 64 },
  { min: 0.05, mid: 0.375, step: 16 },
  { min: 0.15, mid: 1, step: 4 },
  { min: 0.7, mid: 2.5, step: 1 },
];

export const MeshGrid: React.FC<TLGridProps> = ({ x, y, z, size }) => {
  const theme = useDefaultColorTheme();
  const stroke = theme.grey.solid;
  const id = React.useId();

  return (
    <svg id={id} className='tl-grid' version='1.1' xmlns='http://www.w3.org/2000/svg'>
      <defs id={id}>
        {GRID_STEPS.map(({ min, mid, step }, i) => {
          const s = step * size * z;
          const xo = 0.5 + x * z;
          const yo = 0.5 + y * z;
          const gxo = xo > 0 ? xo % s : s + (xo % s);
          const gyo = yo > 0 ? yo % s : s + (yo % s);
          const opacity = (z < mid ? modulate(z, [min, mid], [0, 1]) : 1) * 0.15;
          const patternId = `${id}-step-${step}`;
          return (
            <pattern key={patternId} id={patternId} width={s} height={s} patternUnits='userSpaceOnUse'>
              <line style={{ stroke }} x1={gxo - s} y1={gyo} x2={gxo + s} y2={gyo} opacity={opacity} />
              <line style={{ stroke }} x1={gxo} y1={gyo - s} x2={gxo} y2={gyo + s} opacity={opacity} />
            </pattern>
          );
        })}
      </defs>
      {GRID_STEPS.map(({ step }) => {
        const patternId = `${id}-step-${step}`;
        return <rect key={patternId} width='100%' height='100%' fill={`url(#${patternId})`} />;
      })}
    </svg>
  );
};
