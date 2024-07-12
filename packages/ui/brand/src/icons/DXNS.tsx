//
// Copyright 2023 DXOS.org
//

import { type Icon, IconBase, type IconWeight } from '@phosphor-icons/react';
import React, { forwardRef, type ReactElement } from 'react';

const weights = new Map<IconWeight, ReactElement>([
  [
    'regular',
    // eslint-disable-next-line react/jsx-key
    <g
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinejoin: 'round',
        strokeMiterlimit: 2,
      }}
    >
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M49.285,99.535L227.063,266.206L233.754,269.776L709.185,379.616L722.442,376.046L1017.38,99.535L1007.41,74.313L59.259,74.313L49.285,99.535M96.137,103.479L244.146,242.242L708.169,349.446L970.53,103.479L96.137,103.479' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M240.121,269.814L1010.49,103.142L1004.32,74.635L233.953,241.306L240.121,269.814Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M533.327,513.34L702.487,354.763L722.435,376.042L543.301,543.969L523.353,543.968L227.057,266.202L247.004,244.923L533.327,513.34Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M59.259,992.354L1007.41,992.354L1017.38,967.132L722.442,690.621L709.185,687.051L233.754,796.891L227.063,800.461L49.285,967.132L59.259,992.354M244.146,824.425L96.137,963.187L970.53,963.187L708.169,717.221L244.146,824.425' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M233.953,825.36L1004.32,992.031L1010.49,963.524L240.121,796.853L233.953,825.36Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M533.327,553.328L247.004,821.745L227.057,800.466L523.353,522.7L543.301,522.7L722.435,690.626L702.487,711.905L533.327,553.328Z' />
      </g>
    </g>,
  ],
]);

export const DXNS: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

DXNS.displayName = 'DXNS';
