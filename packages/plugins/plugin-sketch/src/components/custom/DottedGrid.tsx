//
// Copyright 2024 DXOS.org
//
import { type TLGridProps, useDefaultColorTheme } from '@tldraw/tldraw';
import { modulate } from '@tldraw/utils';
import React from 'react';

const GRID_STEPS = [
  { min: -1, mid: 0.15, step: 64 },
  { min: 0.05, mid: 0.375, step: 16 },
  { min: 0.15, mid: 1, step: 4 },
  { min: 0.7, mid: 2.5, step: 1 },
];

// This is a modified version of the default grid from tldraw:
// https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/default-components/DefaultGrid.tsx
//
// We're overriding it to work around a state coupling bug in tldraw where multiple grid instances
// on the same page interfere with each other due to shared IDs. Our solution uses React.useId()
// to generate unique IDs for each grid instance, preventing conflicts.
//
// TODO(Zan): Revert this to the default implementation once the issue has been fixed upstream in tldraw.
export const DottedGrid = ({ x, y, z, size }: TLGridProps) => {
  const theme = useDefaultColorTheme();
  const stroke = theme.grey.solid;
  const id = React.useId();

  return (
    <svg id={id} className='tl-grid' version='1.1' xmlns='http://www.w3.org/2000/svg'>
      <defs>
        {GRID_STEPS.map(({ min, mid, step }, i) => {
          const s = step * size * z;
          const xo = 0.5 + x * z;
          const yo = 0.5 + y * z;
          const gxo = xo > 0 ? xo % s : s + (xo % s);
          const gyo = yo > 0 ? yo % s : s + (yo % s);
          const opacity = z < mid ? modulate(z, [min, mid], [0, 1]) : 1;
          const patternId = `${id}-step-${step}`;
          return (
            <pattern key={patternId} id={patternId} width={s} height={s} patternUnits='userSpaceOnUse'>
              <circle className='tl-grid-dot' cx={gxo} cy={gyo} r={1} opacity={opacity} fill={stroke} stroke={stroke} />
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
