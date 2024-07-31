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
        <path d='M547.364,1007.44L548.457,460.268L519.29,460.21L518.197,1007.38L547.364,1007.44Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M54.139,250.695L528.213,428.47L538.454,401.16L64.38,223.385L54.139,250.695Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <rect x='519.303' y='59.261' width='29.167' height='550.2' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M528.213,665.508L1002.29,843.284L1012.53,815.975L538.454,638.199L528.213,665.508Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M1002.29,223.382L528.216,401.16L538.457,428.47L1012.53,250.692L1002.29,223.382Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M528.213,638.199L54.139,815.976L64.38,843.285L538.454,665.508L528.213,638.199Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M1021.99,829.63L1021.99,237.037L1012.54,223.388L540.115,45.61L534.978,44.676L533.885,44.676L528.77,45.602L54.143,223.38L44.675,237.064L45.781,829.654L55.228,843.275L527.643,1021.05L537.894,1021.06L1012.52,843.286L1021.99,829.63ZM73.86,247.14L74.929,819.526L532.791,991.826L992.823,819.519L992.823,247.131L534.421,74.631L73.86,247.14Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M520.356,51.633L46.835,822L71.683,837.274L545.204,66.906L520.356,51.633Z' />
      </g>
      <g transform='matrix(0.239925,0,0,0.239925,0,0)'>
        <path d='M995.005,229.366L520.378,996.709L545.183,1012.05L1019.81,244.708L995.005,229.366Z' />
      </g>
    </g>,
  ],
]);

export const KUBE: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

KUBE.displayName = 'KUBE';
