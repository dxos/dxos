//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { DXOS_HORIZONTAL_LOCKUP } from '../../paths.ts';

const { scale, x, y } = DXOS_HORIZONTAL_LOCKUP.transform;
const LOCKUP_TRANSFORM = `matrix(${scale},0,0,${scale},${x},${y})`;

const defaultSize = 'w-[256px] h-[128px]';

export const DXOSHorizontalType: FC<{ className?: string }> = ({ className = defaultSize }) => {
  return (
    <svg
      viewBox={DXOS_HORIZONTAL_LOCKUP.viewBox}
      version='1.1'
      xmlns='http://www.w3.org/2000/svg'
      xmlSpace='preserve'
      className={className}
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinejoin: 'round',
        strokeMiterlimit: 2,
      }}
    >
      {(['D', 'X', 'O', 'S', 'mark'] as const).map((glyph) => (
        <g key={glyph} transform={LOCKUP_TRANSFORM}>
          <path d={DXOS_HORIZONTAL_LOCKUP.paths[glyph]} />
        </g>
      ))}
    </svg>
  );
};
