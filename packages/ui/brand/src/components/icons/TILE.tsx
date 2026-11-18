//
// Copyright 2026 DXOS.org
//

import { type IconProps, type IconWeight } from '@phosphor-icons/react';
import IconBase from '@phosphor-icons/react/dist/lib/IconBase';
import React, { type ReactElement, forwardRef } from 'react';

// Drawn from `assets/icons/tile.svg`, which is the same 256 canvas the Phosphor base uses.
const weights = new Map<IconWeight, ReactElement>([
  [
    'regular',
    <g style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}>
      <path d='M20.048,130.298L130.298,20.048A3.25,3.25 0 0 0 125.702,15.452L15.452,125.702A3.25,3.25 0 0 0 20.048,130.298Z' />
      <path d='M125.702,20.048L235.952,130.298A3.25,3.25 0 0 0 240.548,125.702L130.298,15.452A3.25,3.25 0 0 0 125.702,20.048Z' />
      <path d='M235.952,125.702L125.702,235.952A3.25,3.25 0 0 0 130.298,240.548L240.548,130.298A3.25,3.25 0 0 0 235.952,125.702Z' />
      <path d='M130.298,235.952L20.048,125.702A3.25,3.25 0 0 0 15.452,130.298L125.702,240.548A3.25,3.25 0 0 0 130.298,235.952Z' />
      <path d='M70.577,75.173L180.827,185.423A3.25,3.25 0 0 0 185.423,180.827L75.173,70.577A3.25,3.25 0 0 0 70.577,75.173Z' />
      <path d='M180.827,70.577L70.577,180.827A3.25,3.25 0 0 0 75.173,185.423L185.423,75.173A3.25,3.25 0 0 0 180.827,70.577Z' />
      <path d='M212.986,153.264L157.861,98.139A3.25,3.25 0 0 0 153.264,102.736L208.389,157.861A3.25,3.25 0 0 0 212.986,153.264Z' />
      <path d='M157.861,157.861L212.986,102.736A3.25,3.25 0 0 0 208.389,98.139L153.264,153.264A3.25,3.25 0 0 0 157.861,157.861Z' />
      <path d='M199.204,111.921L171.642,84.358A3.25,3.25 0 0 0 167.046,88.954L194.608,116.517A3.25,3.25 0 0 0 199.204,111.921Z' />
      <path d='M171.642,116.517L199.204,88.954A3.25,3.25 0 0 0 194.608,84.358L167.046,111.921A3.25,3.25 0 0 0 171.642,116.517Z' />
    </g>,
  ],
]);

export const TILE = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props} weights={weights} />
));

TILE.displayName = 'TILE';
